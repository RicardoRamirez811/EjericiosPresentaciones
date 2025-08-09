(() => {
  // --- Referencias de UI ---
  const canvas  = document.getElementById('canvas');
  const ctx     = canvas.getContext('2d');

  const toolBtns = document.querySelectorAll('.tool-btn');
  const colorEl  = document.getElementById('color');
  const widthEl  = document.getElementById('width');
  const fillEl   = document.getElementById('fill');
  const fileEl   = document.getElementById('file');
  const saveBtn  = document.getElementById('save');
  const clearBtn = document.getElementById('clear');
  const undoBtn  = document.getElementById('undo');
  const redoBtn  = document.getElementById('redo');

  // --- Estado ---
  let tool = 'pencil';
  let drawing = false;
  let startX = 0, startY = 0;
  let snapshot = null;
  const undoStack = [];
  const redoStack = [];

  // --- Herramienta activa ---
  toolBtns.forEach(b=>{
    b.addEventListener('click', () => {
      toolBtns.forEach(x => x.setAttribute('aria-pressed','false'));
      b.setAttribute('aria-pressed','true');
      tool = b.dataset.tool;
    });
  });

  // --- Utilidades ---
  function pushUndo() {
    undoStack.push(canvas.toDataURL('image/png'));
    if (undoStack.length > 50) undoStack.shift();
    undoBtn.disabled = undoStack.length === 0;
    // cada acción nueva invalida redo
    redoStack.length = 0;
    redoBtn.disabled = true;
  }

  function restoreFrom(dataUrl) {
    const img = new Image();
    img.onload = () => {
      // Redimensiona el canvas a la imagen (útil tras cargar/undo/redo)
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0);
    };
    img.src = dataUrl;
  }

  function takeSnapshot() {
    snapshot = ctx.getImageData(0,0,canvas.width,canvas.height);
  }
  function restoreSnapshot() {
    if (snapshot) ctx.putImageData(snapshot,0,0);
  }

  function getPos(evt){
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (evt.touches && evt.touches[0]) {
      x = evt.touches[0].clientX - rect.left;
      y = evt.touches[0].clientY - rect.top;
    } else {
      x = evt.clientX - rect.left;
      y = evt.clientY - rect.top;
    }
    // Corrige por escala CSS vs tamaño real del canvas
    x *= canvas.width / rect.width;
    y *= canvas.height / rect.height;
    return {x, y};
  }

  // --- Dibujo ---
  function startDraw(evt){
    evt.preventDefault();
    const p = getPos(evt);
    startX = p.x; startY = p.y;
    drawing = true;

    ctx.strokeStyle = colorEl.value;
    ctx.fillStyle = colorEl.value;
    ctx.lineWidth = +widthEl.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    takeSnapshot();

    if (tool === 'pencil') {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
    }
  }

  function draw(evt){
    if (!drawing) return;
    const p = getPos(evt);

    if (tool === 'pencil'){
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      return;
    }

    // Previsualización
    restoreSnapshot();
    ctx.beginPath();

    if (tool === 'line'){
      ctx.moveTo(startX, startY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else if (tool === 'rect'){
      const w = p.x - startX;
      const h = p.y - startY;
      if (fillEl.checked) ctx.fillRect(startX, startY, w, h);
      ctx.strokeRect(startX, startY, w, h);
    } else if (tool === 'circle'){
      const dx = p.x - startX;
      const dy = p.y - startY;
      const r = Math.hypot(dx, dy);
      ctx.arc(startX, startY, r, 0, Math.PI*2);
      if (fillEl.checked) ctx.fill();
      ctx.stroke();
    }
  }

  function endDraw(){
    if (!drawing) return;
    drawing = false;
    snapshot = null;
    pushUndo();
  }

  // Mouse
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', endDraw);

  // Touch
  canvas.addEventListener('touchstart', startDraw, {passive:false});
  canvas.addEventListener('touchmove', draw, {passive:false});
  window.addEventListener('touchend', endDraw, {passive:false});
  window.addEventListener('touchcancel', endDraw, {passive:false});

  // Cargar imagen
  fileEl.addEventListener('change', (e)=>{
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img,0,0);
        // reinicia histórico
        undoStack.length = 0;
        redoStack.length = 0;
        undoBtn.disabled = true;
        redoBtn.disabled = true;
        pushUndo();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    // permitir recargar el mismo archivo
    e.target.value = '';
  });

  // Guardar
  saveBtn.addEventListener('click', ()=>{
    const a = document.createElement('a');
    a.download = 'canvas.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  // Limpiar
  clearBtn.addEventListener('click', ()=>{
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pushUndo();
  });

  // Deshacer / Rehacer
  undoBtn.addEventListener('click', ()=>{
    if (undoStack.length === 0) return;
    const current = canvas.toDataURL('image/png');
    redoStack.push(current);
    const prev = undoStack.pop();
    restoreFrom(prev);
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
  });
  redoBtn.addEventListener('click', ()=>{
    if (redoStack.length === 0) return;
    const current = canvas.toDataURL('image/png');
    undoStack.push(current);
    const next = redoStack.pop();
    restoreFrom(next);
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
  });

  // Estado inicial
  pushUndo();
})();
