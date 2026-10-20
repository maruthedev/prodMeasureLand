class PolygonPointCalculator {
  constructor() {
    this.polygonSides = document.getElementById('polygonSides');
    this.sideInputsWrap = document.getElementById('sideInputsWrap');
    this.calculateBtn = document.getElementById('calculateBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.messageBox = document.getElementById('messageBox');
    this.resultCard = document.getElementById('resultCard');
    this.summaryCard = document.getElementById('summaryCard');
    this.summaryOverview = document.getElementById('summaryOverview');
    this.summaryDetailContent = document.getElementById('summaryDetailContent');
    this.summaryDetails = document.getElementById('summaryDetails');
    this.toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
    this.toggleDetailsIcon = document.getElementById('toggleDetailsIcon');
    this.resultSummary = document.getElementById('resultSummary');
    this.vertexDistances = document.getElementById('vertexDistances');
    this.sideDistances = document.getElementById('sideDistances');
    this.canvas = document.getElementById('polygonCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sideList = document.getElementById('sideList');
    this.sideListCard = document.getElementById('sideListCard');
    this.highlightedSideIndex = null;
    this.highlightedProjection = false;
    this.lastCalculatedResult = null;
    this.detailsExpanded = false;
    this.canvasLabelOffsets = new Map();
    this.canvasLabels = [];
    this.draggedCanvasLabel = null;

    this.polygonNames = {
      3: ['A', 'B', 'C'],
      4: ['A', 'B', 'C', 'D'],
      5: ['A', 'B', 'C', 'D', 'E']
    };

    this.sideLabels = {
      3: ['AB', 'BC', 'CA'],
      4: ['AB', 'BC', 'CD', 'DA'],
      5: ['AB', 'BC', 'CD', 'DE', 'EA']
    };

    this.bindEvents();
    this.renderSideInputs(Number(this.polygonSides.value));
    this.renderSideList(Number(this.polygonSides.value));
  }

  bindEvents() {
    this.polygonSides.addEventListener('change', () => {
      const count = Number(this.polygonSides.value);
      this.lastCalculatedResult = null;
      this.highlightedSideIndex = null;
      this.renderSideInputs(count);
      this.resultCard.classList.add('d-none');
      this.hideMessage();
      this.renderSideList(count);
      this.drawPolygonPreview();
    });

    this.calculateBtn.addEventListener('click', () => {
      const count = Number(this.polygonSides.value);
      if (count === 3) {
        this.computeTriangleResult();
        return;
      }

      this.showMessage(this.getMissingReason(count), 'warning');
    });

    this.resetBtn.addEventListener('click', () => {
      this.resetCalculator();
    });

    this.toggleDetailsBtn.addEventListener('click', () => {
      this.detailsExpanded = !this.detailsExpanded;
      this.updateDetailsVisibility();
    });

    this.bindCanvasLabelDragging();
  }

  bindCanvasLabelDragging() {
    this.canvas.addEventListener('pointerdown', (event) => {
      const point = this.getCanvasPointerPosition(event);
      const label = [...this.canvasLabels].reverse().find((item) => (
        point.x >= item.left && point.x <= item.right && point.y >= item.top && point.y <= item.bottom
      ));

      if (!label) return;

      event.preventDefault();
      this.draggedCanvasLabel = {
        key: label.key,
        pointerId: event.pointerId,
        x: point.x,
        y: point.y
      };
      this.canvas.setPointerCapture(event.pointerId);
      this.canvas.style.cursor = 'grabbing';
    });

    this.canvas.addEventListener('pointermove', (event) => {
      const point = this.getCanvasPointerPosition(event);

      if (this.draggedCanvasLabel && this.draggedCanvasLabel.pointerId === event.pointerId) {
        event.preventDefault();
        const offset = this.canvasLabelOffsets.get(this.draggedCanvasLabel.key) || { x: 0, y: 0 };
        offset.x += point.x - this.draggedCanvasLabel.x;
        offset.y += point.y - this.draggedCanvasLabel.y;
        this.canvasLabelOffsets.set(this.draggedCanvasLabel.key, offset);
        this.draggedCanvasLabel.x = point.x;
        this.draggedCanvasLabel.y = point.y;
        this.drawPolygonPreview(this.lastCalculatedResult?.previewOptions || {});
        return;
      }

      const overLabel = this.canvasLabels.some((item) => (
        point.x >= item.left && point.x <= item.right && point.y >= item.top && point.y <= item.bottom
      ));
      this.canvas.style.cursor = overLabel ? 'grab' : 'default';
    });

    const finishDragging = (event) => {
      if (!this.draggedCanvasLabel || this.draggedCanvasLabel.pointerId !== event.pointerId) return;
      this.draggedCanvasLabel = null;
      this.canvas.style.cursor = 'default';
    };

    this.canvas.addEventListener('pointerup', finishDragging);
    this.canvas.addEventListener('pointercancel', finishDragging);
    this.canvas.addEventListener('lostpointercapture', finishDragging);
  }

  getCanvasPointerPosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (event.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  updateDetailsVisibility() {
    if (this.detailsExpanded) {
      this.summaryDetailContent.classList.remove('d-none');
      this.toggleDetailsIcon.classList.remove('fa-chevron-down');
      this.toggleDetailsIcon.classList.add('fa-chevron-up');
    } else {
      this.summaryDetailContent.classList.add('d-none');
      this.toggleDetailsIcon.classList.add('fa-chevron-down');
      this.toggleDetailsIcon.classList.remove('fa-chevron-up');
    }
  }

  resetCalculator() {
    this.lastCalculatedResult = null;
    this.highlightedSideIndex = null;
    this.canvasLabelOffsets.clear();
    this.polygonSides.value = 3;
    this.renderSideInputs(3);
    this.renderSideList(3);
    this.resultCard.classList.add('d-none');
    this.summaryCard.classList.add('d-none');
    this.hideMessage();
    this.drawPolygonPreview();
  }

  renderSideList(count) {
    this.sideList.innerHTML = '';
    const labels = this.sideLabels[count] || [];

    if (!this.lastCalculatedResult) {
      this.sideList.style.display = 'none';
      return;
    }

    this.sideList.style.display = 'flex';

    labels.forEach((label, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'list-group-item list-group-item-action';
      button.dataset.index = String(index);
      const value = Number(document.getElementById(`side-${index}`)?.value || 0);
      button.innerHTML = `${label}<span class="float-end text-muted">${value > 0 ? this.formatMeter(value) : '-'}</span>`;

      if (this.highlightedSideIndex === index) {
        button.classList.add('active');
      }

      button.addEventListener('click', () => {
        if (this.highlightedSideIndex === index) {
          this.highlightedSideIndex = null;
        } else {
          this.highlightedSideIndex = index;
        }
        this.renderSideList(count);
        this.updateResultSummary();
        this.drawPolygonPreview(this.lastCalculatedResult?.previewOptions || {});
      });

      this.sideList.appendChild(button);
    });
  }

  showMessage(text, type = 'warning') {
    this.messageBox.textContent = text;
    this.messageBox.className = `alert mt-4 mb-0 alert-${type}`;
    this.messageBox.classList.remove('d-none');
  }

  hideMessage() {
    this.messageBox.textContent = '';
    this.messageBox.className = 'alert mt-4 mb-0 d-none';
  }

  formatMeter(value) {
    return `${Number(value).toFixed(2)} m`;
  }

  getMissingReason(count) {
    const sideInputs = Array.from({ length: count }, (_, index) => document.getElementById(`side-${index}`));
    const missingSides = sideInputs.filter((input) => !input || Number(input.value) <= 0);

    if (count === 3) {
      if (missingSides.length > 0) {
        return 'Cần nhập đủ 3 cạnh để tính toán. Vui lòng nhập giá trị dương cho từng cạnh.';
      }
      return '';
    }

    if (missingSides.length > 0) {
      return 'Nút tính toán đang bị vô hiệu hóa vì thiếu dữ liệu đầu vào. Cần nhập đầy đủ độ dài các cạnh trước khi tính toán.';
    }

    return 'Nút tính toán đang bị vô hiệu hóa vì chưa đủ dữ kiện. Cần thêm ít nhất 1 góc đo thực tế (ưu tiên đo góc) để xác định điểm cách đều các đỉnh. Đường chéo không thể thay thế góc trong tính toán này.';
  }

  renderSideInputs(count) {
    const labels = this.sideLabels[count] || [];
    this.sideInputsWrap.innerHTML = '';

    labels.forEach((label, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'mb-3';

      const inputGroup = document.createElement('div');
      inputGroup.className = 'input-group';

      const inputLabel = document.createElement('span');
      inputLabel.className = 'input-group-text';
      inputLabel.textContent = `Cạnh ${label}`;

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0.01';
      input.step = '0.01';
      input.placeholder = '0.00';
      input.className = 'form-control';
      input.id = `side-${index}`;
      input.dataset.index = String(index);
      input.addEventListener('input', () => {
        this.lastCalculatedResult = null;
        this.highlightedSideIndex = null;
        this.resultCard.classList.add('d-none');
        this.updateButtonState();
        this.renderSideList(count);
        this.drawPolygonPreview();
      });

      const unit = document.createElement('span');
      unit.className = 'input-group-text';
      unit.textContent = 'm';

      inputGroup.appendChild(inputLabel);
      inputGroup.appendChild(input);
      inputGroup.appendChild(unit);
      wrapper.appendChild(inputGroup);
      this.sideInputsWrap.appendChild(wrapper);
    });

    this.updateButtonState();
    this.drawPolygonPreview();
  }

  getSideInputs(count) {
    return Array.from({ length: count }, (_, index) => document.getElementById(`side-${index}`));
  }

  updateButtonState() {
    const count = Number(this.polygonSides.value);
    const sideInputs = this.getSideInputs(count);
    const allSidesFilled = sideInputs.every((input) => input && Number(input.value) > 0);

    if (count === 3) {
      if (allSidesFilled) {
        this.calculateBtn.disabled = false;
        this.hideMessage();
      } else {
        this.calculateBtn.disabled = true;
        this.showMessage(this.getMissingReason(count), 'warning');
      }
      return;
    }

    if (count === 4 || count === 5) {
      if (!allSidesFilled) {
        this.calculateBtn.disabled = true;
        this.showMessage(this.getMissingReason(count), 'warning');
        return;
      }

      this.calculateBtn.disabled = true;
      this.showMessage(this.getMissingReason(count), 'warning');
    }
  }

  triangleArea(a, b, c) {
    return Math.abs((a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)) / 2);
  }

  distanceBetween(pointA, pointB) {
    return Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
  }

  pointInTriangle(point, triangle) {
    const [a, b, c] = triangle;
    const totalArea = this.triangleArea(a, b, c);
    const area1 = this.triangleArea(point, b, c);
    const area2 = this.triangleArea(a, point, c);
    const area3 = this.triangleArea(a, b, point);
    return Math.abs((area1 + area2 + area3) - totalArea) < 1e-6;
  }

  distanceToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      return this.distanceBetween(point, start);
    }

    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
    const projection = {
      x: start.x + t * dx,
      y: start.y + t * dy
    };

    return this.distanceBetween(point, projection);
  }

  buildTriangleVertices(sideValues) {
    const [ab, bc, ca] = sideValues;
    const a = { x: 0, y: 0 };
    const b = { x: ab, y: 0 };
    const x = (ca * ca + ab * ab - bc * bc) / (2 * ab);
    const y = Math.sqrt(Math.max(0, ca * ca - x * x));
    const c = { x, y };
    return [a, b, c];
  }

  isValidTriangle(sideValues) {
    const [ab, bc, ca] = sideValues;
    return ab + bc > ca && ab + ca > bc && bc + ca > ab;
  }

  fitVerticesToCanvas(vertices, padding = 30, boundsPoints = vertices) {
    const canvas = this.canvas;
    if (!vertices || vertices.length === 0) {
      return [];
    }

    const xs = boundsPoints.map((point) => point.x);
    const ys = boundsPoints.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);

    const scale = Math.min(
      (canvas.width - padding * 2) / width,
      (canvas.height - padding * 2) / height
    );

    return vertices.map((point, index) => ({
      x: padding + (point.x - minX) * scale,
      y: canvas.height - padding - (point.y - minY) * scale,
      label: point.label || this.polygonNames[vertices.length === 3 ? 3 : Number(this.polygonSides.value)][index]
    }));
  }

  getCanvasTransform(vertices, padding = 30, boundsPoints = vertices) {
    if (!vertices || vertices.length === 0) {
      return null;
    }

    const xs = boundsPoints.map((point) => point.x);
    const ys = boundsPoints.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);

    return {
      minX,
      minY,
      scale: Math.min(
        (this.canvas.width - padding * 2) / width,
        (this.canvas.height - padding * 2) / height
      ),
      padding
    };
  }

  transformPointToCanvas(point, transform) {
    if (!transform) return point;
    return {
      x: transform.padding + (point.x - transform.minX) * transform.scale,
      y: this.canvas.height - transform.padding - (point.y - transform.minY) * transform.scale
    };
  }

  calculateCircumcenter(vertices) {
    const [a, b, c] = vertices;
    const ax = a.x;
    const ay = a.y;
    const bx = b.x;
    const by = b.y;
    const cx = c.x;
    const cy = c.y;

    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-9) {
      throw new Error('Không thể xác định điểm cách đều 3 đỉnh với dữ liệu hiện tại.');
    }

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

    return { x: ux, y: uy };
  }

  getNearestSideInfo(point, triangle, vertexNames) {
    const sides = [
      { name: 'AB', start: triangle[0], end: triangle[1], startLabel: vertexNames[0], endLabel: vertexNames[1] },
      { name: 'BC', start: triangle[1], end: triangle[2], startLabel: vertexNames[1], endLabel: vertexNames[2] },
      { name: 'CA', start: triangle[2], end: triangle[0], startLabel: vertexNames[2], endLabel: vertexNames[0] }
    ];

    let best = null;
    sides.forEach((side) => {
      const distance = this.distanceToSegment(point, side.start, side.end);
      if (!best || distance < best.distance) {
        best = { ...side, distance };
      }
    });

    if (best) {
      best.projection = this.projectPointToSegment(point, best.start, best.end);
    }

    return best;
  }

  computeTriangleResult() {
    const values = Array.from({ length: 3 }, (_, index) => Number(document.getElementById(`side-${index}`).value));

    if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
      this.showMessage('Vui lòng nhập đủ 3 cạnh hợp lệ để tính toán.', 'danger');
      return;
    }

    if (!this.isValidTriangle(values)) {
      this.showMessage('Ba độ dài cạnh này không tạo thành một tam giác hợp lệ. Vui lòng kiểm tra lại dữ liệu.', 'danger');
      return;
    }

    const [ab, bc, ca] = values;
    const triangle = this.buildTriangleVertices([ab, bc, ca]);
    const center = this.calculateCircumcenter(triangle);
    const vertexNames = this.polygonNames[3];

    const vertexRows = vertexNames.map((name, index) => ({
      name,
      value: this.distanceBetween(center, triangle[index])
    }));

    const sideRows = [
      { name: 'AB', value: this.distanceToSegment(center, triangle[0], triangle[1]) },
      { name: 'BC', value: this.distanceToSegment(center, triangle[1], triangle[2]) },
      { name: 'CA', value: this.distanceToSegment(center, triangle[2], triangle[0]) }
    ];

    const insidePolygon = this.pointInTriangle(center, triangle);
    const nearestSide = this.getNearestSideInfo(center, triangle, vertexNames);
    const phLength = this.distanceBetween(center, nearestSide.projection);
    const hToStart = this.distanceBetween(nearestSide.projection, nearestSide.start);
    const hToEnd = this.distanceBetween(nearestSide.projection, nearestSide.end);

    this.lastCalculatedResult = {
      center,
      triangle,
      insidePolygon,
      nearestSide,
      phLength,
      hToStart,
      hToEnd,
      previewOptions: { center, triangle, insidePolygon, polygonType: 3, nearestSide }
    };

    this.updateResultSummary();

    this.vertexDistances.innerHTML = vertexRows
      .map(({ name, value }) => `<tr><td>${name}</td><td>${this.formatMeter(value)}</td></tr>`)
      .join('');

    this.sideDistances.innerHTML = sideRows
      .map(({ name, value }) => `<tr><td>${name}</td><td>${this.formatMeter(value)}</td></tr>`)
      .join('');

    this.resultCard.classList.remove('d-none');

    try {
      this.drawPolygonPreview({ center, triangle, insidePolygon, polygonType: 3, nearestSide });
    } catch (error) {
      console.error('Polygon preview error:', error);
      this.showMessage('Không thể hiển thị visualizer với dữ liệu hiện tại. Vui lòng kiểm tra lại các cạnh đo được.', 'danger');
    }

    this.renderSideList(3);

    if (insidePolygon) {
      this.showMessage('Điểm tính toán nằm trong đa giác và cách đều các đỉnh.', 'success');
    } else {
      this.showMessage('CẢNH BÁO: điểm tính toán nằm ngoài đa giác. Hãy kiểm tra lại dữ liệu đo đạc.', 'danger');
    }
  }

  updateResultSummary() {
    if (!this.lastCalculatedResult) return;

    const { center, triangle, nearestSide } = this.lastCalculatedResult;
    const sideIndex = this.highlightedSideIndex;
    const side = sideIndex === null
      ? nearestSide
      : {
          name: this.sideLabels[3][sideIndex],
          start: triangle[sideIndex],
          end: triangle[(sideIndex + 1) % triangle.length],
          startLabel: this.polygonNames[3][sideIndex],
          endLabel: this.polygonNames[3][(sideIndex + 1) % triangle.length]
        };
    const projection = this.projectPointToSegment(center, side.start, side.end);
    const vertexDistance = this.distanceBetween(center, triangle[0]);
    const phLength = this.distanceBetween(center, projection);
    const hToStart = this.distanceBetween(projection, side.start);
    const hToEnd = this.distanceBetween(projection, side.end);
    const sideDescription = sideIndex === null ? 'cạnh gần nhất' : `cạnh ${side.name} đang khảo sát`;

    this.resultSummary.innerHTML = `
      <p class="mb-2"><strong>Đa giác:</strong> ${this.polygonNames[3].join('')}</p>
      <p class="mb-2"><strong>Khoảng cách từ điểm P tới các đỉnh:</strong> ${this.formatMeter(vertexDistance)}</p>
      <p class="mb-2"><strong>Khoảng cách từ điểm P tới ${sideDescription}:</strong> ${this.formatMeter(phLength)}</p>
      <p class="mb-2"><strong>Cạnh được thống kê:</strong> ${side.name}</p>
      <p class="mb-2"><strong>H đến ${side.startLabel}:</strong> ${this.formatMeter(hToStart)}</p>
      <p class="mb-0"><strong>H đến ${side.endLabel}:</strong> ${this.formatMeter(hToEnd)}</p>
    `;
  }

  getVerticesFromInput(count) {
    const values = this.getSideInputs(count)
      .map((input) => Number(input?.value || 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (values.length !== count) {
      return [];
    }

    const stepAngle = (Math.PI * 2) / count;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(this.canvas.width, this.canvas.height) * 0.28;

    const vertices = [];
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + i * stepAngle;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      vertices.push({ x, y, label: this.polygonNames[count][i] });
    }

    return vertices;
  }

  buildRegularPolygonVertices(count, radius = 100) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const step = (Math.PI * 2) / count;
    return Array.from({ length: count }, (_, index) => {
      const angle = -Math.PI / 2 + index * step;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        label: this.polygonNames[count][index]
      };
    });
  }

  drawCanvasText(text, x, y, color = '#0f172a', font = 'bold 12px Segoe UI', align = 'center', bg = null, draggableKey = null) {
    const drawingCtx = this.ctx || this.canvas.getContext('2d');
    const renderedWidth = this.canvas.getBoundingClientRect().width || this.canvas.width;
    const fontScale = Math.min(2, Math.max(1, this.canvas.width / renderedWidth));
    const scaledFont = font.replace(/(\d+(?:\.\d+)?)px/g, (_, size) => `${Number(size) * fontScale}px`);
    const offset = draggableKey ? this.canvasLabelOffsets.get(draggableKey) || { x: 0, y: 0 } : { x: 0, y: 0 };
    const textX = x + offset.x;
    const textY = y + offset.y;
    drawingCtx.save();
    drawingCtx.font = scaledFont;
    drawingCtx.textAlign = align;
    drawingCtx.fillStyle = color;

    if (bg) {
      const metrics = drawingCtx.measureText(text);
      const padX = 6 * fontScale;
      drawingCtx.fillStyle = bg;
      const rectX = align === 'left' ? textX : textX - metrics.width / 2 - padX;
      drawingCtx.fillRect(rectX, textY - 12 * fontScale, metrics.width + padX * 2, 18 * fontScale);
      drawingCtx.fillStyle = color;
    }

    drawingCtx.fillText(text, textX, textY);
    if (draggableKey) {
      const metrics = drawingCtx.measureText(text);
      const textWidth = metrics.width + 14 * fontScale;
      const left = align === 'left' ? textX - 6 * fontScale : textX - textWidth / 2;
      const fontSize = Number((scaledFont.match(/([\d.]+)px/) || [0, 12])[1]);
      this.canvasLabels.push({
        key: draggableKey,
        left,
        right: left + textWidth,
        top: textY - fontSize * 1.3,
        bottom: textY + fontSize * 0.6
      });
    }
    drawingCtx.restore();
  }

  getPolygonSideLengths(count) {
    const values = this.getSideInputs(count)
      .map((input) => Number(input?.value || 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (values.length !== count) {
      return [];
    }

    return values;
  }

  drawEdgeLengthLabels(vertices, count) {
    if (!vertices || vertices.length < 3) return;

    const sideLengths = this.getPolygonSideLengths(count);
    if (sideLengths.length !== count) return;

    vertices.forEach((point, index) => {
      const nextIndex = (index + 1) % vertices.length;
      const start = vertices[index];
      const end = vertices[nextIndex];
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = dx / length;
      const ny = dy / length;
      const offset = 18;
      const labelX = midX - ny * offset;
      const labelY = midY + nx * offset;
      const label = `${this.sideLabels[count][index]} = ${this.formatMeter(sideLengths[index])}`;

      this.drawCanvasText(label, labelX, labelY, '#0f172a', 'bold 11px Segoe UI', 'center', 'rgba(255,255,255,0.8)');
    });
  }

  drawVertexLabels(vertices, count) {
    if (!vertices || vertices.length === 0) return;

    vertices.forEach((point, index) => {
      const label = point.label || this.polygonNames[count][index];
      const baseX = point.x + 12;
      const baseY = point.y - 12;
      this.drawCanvasText(label, baseX, baseY, '#0f172a', 'bold 12px Segoe UI', 'left', 'rgba(255,255,255,0.7)', `vertex:${count}:${index}`);
    });
  }

  drawPolygonPreview(options = {}) {
    const { canvas, ctx } = this;
    const count = Number(this.polygonSides.value);
    const highlightedIndex = this.highlightedSideIndex;
    this.canvasLabels = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8f9ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#0d6efd';

    let vertices = [];
    if (count === 3) {
      if (options.triangle) {
        const triangleWithLabels = options.triangle.map((point, index) => ({
          ...point,
          label: this.polygonNames[3][index]
        }));
        const boundsPoints = options.center ? [...options.triangle, options.center] : triangleWithLabels;
        vertices = this.fitVerticesToCanvas(triangleWithLabels, 30, boundsPoints);
      } else {
        const values = this.getSideInputs(3)
          .map((input) => Number(input?.value || 0))
          .filter((value) => Number.isFinite(value) && value > 0);

        if (values.length === 3 && this.isValidTriangle(values)) {
          const triangleWithLabels = this.buildTriangleVertices(values).map((point, index) => ({
            ...point,
            label: this.polygonNames[3][index]
          }));
          vertices = this.fitVerticesToCanvas(triangleWithLabels);
        }
      }
    } else {
      const sideValues = this.getSideInputs(count)
        .map((input) => Number(input?.value || 0))
        .filter((value) => Number.isFinite(value) && value > 0);

      if (sideValues.length === count) {
        const maxSide = Math.max(...sideValues, 1);
        const radius = Math.min(canvas.width, canvas.height) * 0.26;
        const regularVertices = this.buildRegularPolygonVertices(count, radius * (Math.max(0.55, maxSide / 80)));
        vertices = regularVertices.map((point, index) => ({
          ...point,
          label: this.polygonNames[count][index]
        }));
      }
    }

    if (vertices.length > 0) {
      ctx.beginPath();
      vertices.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();

      ctx.fillStyle = highlightedIndex === null ? 'rgba(37, 99, 235, 0.10)' : 'rgba(90, 103, 120, 0.035)';
      ctx.fill();

      vertices.forEach((point, index) => {
        const next = vertices[(index + 1) % vertices.length];
        const isSelected = highlightedIndex !== null && highlightedIndex === index;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = isSelected ? '#0d6efd' : highlightedIndex === null ? '#2563eb' : 'rgba(71, 85, 105, 0.12)';
        ctx.lineWidth = isSelected ? 4 : highlightedIndex === null ? 2 : 1.5;
        ctx.stroke();

      });

      if (highlightedIndex === null) {
        this.drawVertexLabels(vertices, count);
      } else {
        vertices.forEach((point, index) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(71, 85, 105, 0.16)';
          ctx.fill();
          this.drawCanvasText(point.label, point.x + 10, point.y - 10, 'rgba(71, 85, 105, 0.28)', 'bold 12px Segoe UI', 'left', null, `vertex:${count}:${index}`);
        });
      }
    }

    if (options.center && options.triangle && highlightedIndex !== null && highlightedIndex >= 0) {
      const boundsPoints = [...options.triangle, options.center];
      const triangleTransform = this.getCanvasTransform(options.triangle, 30, boundsPoints);
      if (triangleTransform) {
        const centerCanvas = this.transformPointToCanvas(options.center, triangleTransform);
        const sideStartModel = options.triangle[highlightedIndex];
        const sideEndModel = options.triangle[(highlightedIndex + 1) % options.triangle.length];
        const sideStart = this.transformPointToCanvas(sideStartModel, triangleTransform);
        const sideEnd = this.transformPointToCanvas(sideEndModel, triangleTransform);
        const projection = this.projectPointToSegment(centerCanvas, sideStart, sideEnd);
        const sideName = this.sideLabels[count][highlightedIndex];
        const sideLength = this.getPolygonSideLengths(count)[highlightedIndex];
        const startLabel = this.polygonNames[count][highlightedIndex];
        const endLabel = this.polygonNames[count][(highlightedIndex + 1) % count];

        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2.5;
        ctx.moveTo(centerCanvas.x, centerCanvas.y);
        ctx.lineTo(projection.x, projection.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(sideStart.x, sideStart.y);
        ctx.lineTo(sideEnd.x, sideEnd.y);
        ctx.strokeStyle = '#0d6efd';
        ctx.lineWidth = 4;
        ctx.stroke();

        const drawClearPoint = (point, label, color, draggableKey = null) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          this.drawCanvasText(label, point.x + 9, point.y - 9, color, 'bold 12px Segoe UI', 'left', 'rgba(255,255,255,0.92)', draggableKey);
        };

        drawClearPoint(sideStart, startLabel, '#0d3b91', `vertex:${count}:${highlightedIndex}`);
        drawClearPoint(sideEnd, endLabel, '#0d3b91', `vertex:${count}:${(highlightedIndex + 1) % count}`);

        ctx.beginPath();
        ctx.arc(projection.x, projection.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#d97706';
        ctx.fill();
        this.drawCanvasText('H', projection.x + 9, projection.y - 9, '#b45309', 'bold 12px Segoe UI', 'left', 'rgba(255,255,255,0.92)');

        const phLength = this.distanceBetween(options.center, this.projectPointToSegment(options.center, sideStartModel, sideEndModel));
        const hToStart = this.distanceBetween(this.projectPointToSegment(options.center, sideStartModel, sideEndModel), sideStartModel);
        const hToEnd = this.distanceBetween(this.projectPointToSegment(options.center, sideStartModel, sideEndModel), sideEndModel);
        const midpointPH = { x: (centerCanvas.x + projection.x) / 2, y: (centerCanvas.y + projection.y) / 2 };
        const midpointAH = { x: (projection.x + sideStart.x) / 2, y: (projection.y + sideStart.y) / 2 };
        const midpointBH = { x: (projection.x + sideEnd.x) / 2, y: (projection.y + sideEnd.y) / 2 };
        const sideMidpoint = { x: (sideStart.x + sideEnd.x) / 2, y: (sideStart.y + sideEnd.y) / 2 };

        this.drawCanvasText(`PH = ${this.formatMeter(phLength)}`, midpointPH.x, midpointPH.y - 12, '#92400e', 'bold 11px Segoe UI', 'center', 'rgba(255,255,255,0.94)', `distance:PH:${highlightedIndex}`);
        this.drawCanvasText(`${startLabel}H = ${this.formatMeter(hToStart)}`, midpointAH.x, midpointAH.y - 12, '#1e293b', 'bold 11px Segoe UI', 'center', 'rgba(255,255,255,0.94)', `distance:${startLabel}H:${highlightedIndex}`);
        this.drawCanvasText(`${endLabel}H = ${this.formatMeter(hToEnd)}`, midpointBH.x, midpointBH.y - 12, '#1e293b', 'bold 11px Segoe UI', 'center', 'rgba(255,255,255,0.94)', `distance:${endLabel}H:${highlightedIndex}`);
        this.drawCanvasText(`${sideName} = ${this.formatMeter(sideLength)}`, sideMidpoint.x, sideMidpoint.y + 22, '#0d3b91', 'bold 11px Segoe UI', 'center', 'rgba(255,255,255,0.94)', `side-length:${count}:${highlightedIndex}`);
      }
    }

    if (options.center && options.triangle && highlightedIndex === null) {
      const boundsPoints = [...options.triangle, options.center];
      const triangleTransform = this.getCanvasTransform(options.triangle, 30, boundsPoints);
      if (triangleTransform) {
        const centerCanvas = this.transformPointToCanvas(options.center, triangleTransform);
        options.triangle.forEach((vertex, index) => {
          const vertexCanvas = this.transformPointToCanvas(vertex, triangleTransform);
          ctx.beginPath();
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = 'rgba(220, 38, 38, 0.62)';
          ctx.lineWidth = 1.5;
          ctx.moveTo(centerCanvas.x, centerCanvas.y);
          ctx.lineTo(vertexCanvas.x, vertexCanvas.y);
          ctx.stroke();
          ctx.setLineDash([]);

          const midpointX = (centerCanvas.x + vertexCanvas.x) / 2;
          const midpointY = (centerCanvas.y + vertexCanvas.y) / 2;
          const offsetX = vertexCanvas.y - centerCanvas.y;
          const offsetY = centerCanvas.x - vertexCanvas.x;
          const offsetLength = Math.hypot(offsetX, offsetY) || 1;
          const labelX = midpointX + (offsetX / offsetLength) * 12;
          const labelY = midpointY + (offsetY / offsetLength) * 12;
          const vertexName = this.polygonNames[count][index];
          const distance = this.distanceBetween(options.center, vertex);
          this.drawCanvasText(`P${vertexName} = ${this.formatMeter(distance)}`, labelX, labelY, '#991b1b', 'bold 11px Segoe UI', 'center', 'rgba(255,255,255,0.92)', `distance:P${vertexName}`);
        });
      }
    }

    if (options.center && options.triangle) {
      const boundsPoints = [...options.triangle, options.center];
      const centerTransform = this.getCanvasTransform(options.triangle, 30, boundsPoints);
      if (centerTransform) {
        const centerCanvas = this.transformPointToCanvas(options.center, centerTransform);
        ctx.beginPath();
        ctx.arc(centerCanvas.x, centerCanvas.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        this.drawCanvasText('P', centerCanvas.x + 9, centerCanvas.y - 9, '#991b1b', 'bold 12px Segoe UI', 'left', 'rgba(255,255,255,0.92)');
      }
    }

    if (!vertices.length) {
      this.drawCanvasText('Nhập độ dài các cạnh để xem hình đa giác', canvas.width / 2, canvas.height / 2, '#6b7280', '16px Segoe UI', 'center');
    }
  }

  projectPointToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      return { ...start };
    }

    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
    return {
      x: start.x + t * dx,
      y: start.y + t * dy
    };
  }
}

new PolygonPointCalculator();
