'use strict';

// The original Gate_Movie previews use a 30 fps stage. World 4 has two
// separately advancing child clips, so each layer has its own modulo.
window.GatePreview = (() => {
  let manifestPromise;
  function loadManifest() {
    manifestPromise ||= fetch('gate-preview-assets.json', {cache:'no-store'}).then(response => {
      if (!response.ok) throw new Error(`gate-preview-assets.json: HTTP ${response.status}`);
      return response.json();
    }).catch(error => { manifestPromise = null; throw error; });
    return manifestPromise;
  }
  function loadImage(path) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`无法加载 ${path}`));
      image.src = path;
    });
  }
  function visibleClock(){
    let start=null,hiddenAt=document.hidden?performance.now():null,hiddenDuration=0;
    function visibility(){
      const now=performance.now();
      if(document.hidden){if(hiddenAt===null)hiddenAt=now;}
      else if(hiddenAt!==null){if(start!==null)hiddenDuration+=now-hiddenAt;hiddenAt=null;}
    }
    document.addEventListener('visibilitychange',visibility);
    return {elapsed(now){if(document.hidden)return null;if(start===null)start=now;return Math.max(0,now-start-hiddenDuration);},
      dispose(){document.removeEventListener('visibilitychange',visibility);}};
  }
  async function start(canvas, world, onError = console.error, signal = null) {
    const checkAbort=()=>{if(signal?.aborted)throw new DOMException('已取消', 'AbortError');};
    const manifest = await loadManifest();
    checkAbort();
    const spec = manifest.worlds[String(world)];
    if (!spec) throw new Error(`没有世界 ${world} 的展示动画`);
    const origin = world === 2 ? [20, 17] : world === 3 ? [0, 5] : [0, 0];
    const cache = new Map();
    let stopped = false, raf = 0, lastFrame = -1, latestTick = -1;
    function request(path) {
      if (!cache.has(path)) {
        const promise = loadImage(path).catch(error => {if(cache.get(path)===promise)cache.delete(path);throw error;});
        cache.set(path, promise);
      }
      return cache.get(path);
    }
    const background = spec.background ? await request(spec.background) : null;
    checkAbort();
    const first = await Promise.all(spec.layers.map(layer => request(layer.sheets[0])));
    checkAbort();
    canvas.width = world === 2 ? 550 : 530;
    canvas.height = world === 2 ? 400 : world === 3 ? 371 : 366;
    const context = canvas.getContext('2d');
    const clock=visibleClock();
    let ready = first;
    function frameAt(tick, layer) { return tick % layer.frames; }
    function draw(tick, images) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (background) context.drawImage(background, 0, 0);
      spec.layers.forEach((layer, index) => {
        const frame = frameAt(tick, layer), inSheet = frame % layer.perSheet;
        context.drawImage(images[index], (inSheet % layer.columns) * layer.width,
          Math.floor(inSheet / layer.columns) * layer.height, layer.width, layer.height,
          origin[0] + layer.position[0], origin[1] + layer.position[1], layer.width, layer.height);
      });
    }
    function animate(now) {
      if (stopped) return;
      const elapsed=clock.elapsed(now);
      if(elapsed===null){raf=requestAnimationFrame(animate);return;}
      const tick = Math.floor(elapsed * manifest.fps / 1000);
      if (tick !== lastFrame) {
        latestTick=tick;
        const paths = spec.layers.map(layer => layer.sheets[Math.floor(frameAt(tick, layer) / layer.perSheet)]);
        const nextPaths = spec.layers.map(layer => layer.sheets[Math.floor(frameAt(tick + layer.perSheet, layer) / layer.perSheet)]);
        const keep = new Set([...paths, ...nextPaths, ...(spec.background ? [spec.background] : [])]);
        for (const path of cache.keys()) if (!keep.has(path)) cache.delete(path);
        nextPaths.forEach(path => request(path).catch(() => {}));
        Promise.all(paths.map(request)).then(images => {
          if (stopped || tick < latestTick) return;
          ready = images; lastFrame = tick; draw(tick, ready);
        }).catch(error => {if (!stopped && tick===latestTick) {stop(); onError(error);}});
      }
      raf = requestAnimationFrame(animate);
    }
    function stop(){if(stopped)return;stopped=true;cancelAnimationFrame(raf);cache.clear();clock.dispose();signal?.removeEventListener('abort',stop);}
    signal?.addEventListener('abort',stop,{once:true});
    draw(0, ready);
    raf = requestAnimationFrame(animate);
    return {stop};
  }
  return {start,visibleClock};
})();
