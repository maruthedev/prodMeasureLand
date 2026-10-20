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

    const sideItems = [...labels.map((label, index) => ({ label, index }))];
    if (this.lastCalculatedResult && this.lastCalculatedResult.nearestSide) {
      sideItems.push({ label: 'PH', index: 'projection' });
    }

    sideItems.forEach((item) => {
      const isProjection = item.index === 'projection';
      const itemLabel = isProjection ? 'PH' : item.label;
      const itemIndex = isProjection ? null : item.index;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'list-group-item list-group-item-action';
      button.dataset.index = String(itemIndex ?? 'projection');

      if (isProjection) {
        button.innerHTML = `${itemLabel}<span class="float-end text-muted">${this.formatMeter(this.lastCalculatedResult.phLength)}</span>`;
      } else {
        const value = Number(document.getElementById(`side-${item.index}`)?.value || 0);
        if (value > 0) {
          button.innerHTML = `${itemLabel}<span class="float-end text-muted">${this.formatMeter(value)}</span>`;
        } else {
          button.innerHTML = `${itemLabel}<span class="float-end text-muted">-</span>`;
        }
      }

      if (this.highlightedSideIndex === itemIndex || (isProjection && this.highlightedSideIndex === 'projection')) {
        button.classList.add('active');
      }

      button.addEventListener('click', () => {
        const nextIndex = isProjection ? 'projection' : itemIndex;
        if (this.highlightedSideIndex === nextIndex) {
          this.highlightedSideIndex = null;
        } else {
          this.highlightedSideIndex = nextIndex;
        }
        this.renderSideList(count);
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

  fitVerticesToCanvas(vertices, padding = 30) {
    const canvas = this.canvas;
    if (!vertices || vertices.length === 0) {
      return [];
    }

    const xs = vertices.map((point) => point.x);
    const ys = vertices.map((point) => point.y);
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

  getCanvasTransform(vertices, padding = 30) {
    if (!vertices || vertices.length === 0) {
      return null;
    }

    const xs = vertices.map((point) => point.x);
    const ys = vertices.map((point) => point.y);
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

    this.resultSummary.innerHTML = `
      <p class="mb-2"><strong>Đa giác:</strong> ${vertexNames.join('')}</p>
      <p class="mb-2"><strong>Điểm cách đều:</strong> (${center.x.toFixed(2)} m, ${center.y.toFixed(2)} m)</p>
      <p class="mb-2"><strong>Bán kính cách đều:</strong> ${this.formatMeter(vertexRows[0].value)}</p>
      <p class="mb-2"><strong>Trạng thái:</strong> ${insidePolygon ? 'Điểm này nằm bên trong đa giác.' : 'CẢNH BÁO: điểm này nằm ngoài đa giác.'}</p>
      <p class="mb-2"><strong>PH:</strong> ${this.formatMeter(phLength)}</p>
      <p class="mb-2"><strong>H đến ${nearestSide.startLabel}:</strong> ${this.formatMeter(hToStart)}</p>
      <p class="mb-0"><strong>H đến ${nearestSide.endLabel}:</strong> ${this.formatMeter(hToEnd)}</p>
    `;

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

  drawCanvasText(text, x, y, color = '#0f172a', font = 'bold 12px Segoe UI', align = 'center', bg = null) {
    const drawingCtx = this.ctx || this.canvas.getContext('2d');
    drawingCtx.save();
    drawingCtx.font = font;
    drawingCtx.textAlign = align;
    drawingCtx.fillStyle = color;

    if (bg) {
      const metrics = drawingCtx.measureText(text);
      const padX = 6;
      drawingCtx.fillStyle = bg;
      const rectX = align === 'left' ? x : x - metrics.width / 2 - padX;
      drawingCtx.fillRect(rectX, y - 12, metrics.width + padX * 2, 18);
      drawingCtx.fillStyle = color;
    }

    drawingCtx.fillText(text, x, y);
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
      this.drawCanvasText(label, baseX, baseY, '#0f172a', 'bold 12px Segoe UI', 'left', 'rgba(255,255,255,0.7)');
    });
  }

  drawPolygonPreview(options = {}) {
    const { canvas, ctx } = this;
    const count = Number(this.polygonSides.value);
    const highlightedIndex = this.highlightedSideIndex;
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
        vertices = this.fitVerticesToCanvas(triangleWithLabels);
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

      const fillAlpha = highlightedIndex === null ? 0.10 : 0.04;
      ctx.fillStyle = `rgba(37, 99, 235, ${fillAlpha})`;
      ctx.fill();

      vertices.forEach((point, index) => {
        const next = vertices[(index + 1) % vertices.length];
        const isSelected = highlightedIndex !== null && highlightedIndex === index;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = isSelected ? '#0d6efd' : highlightedIndex === null ? '#2563eb' : 'rgba(37, 99, 235, 0.22)';
        ctx.lineWidth = isSelected ? 4 : highlightedIndex === null ? 2 : 1.5;
        ctx.stroke();

        if (highlightedIndex !== null && isSelected) {
          const midX = (point.x + next.x) / 2;
          const midY = (point.y + next.y) / 2;
          const sideLength = this.getPolygonSideLengths(count)[index] ?? 0;
          const label = `${this.sideLabels[count][index]} = ${this.formatMeter(sideLength)}`;
          this.drawCanvasText(label, midX, midY - 12, '#0d3b91', 'bold 11px Segoe UI', 'center', 'rgba(255,255,255,0.9)');
        }
      });

      this.drawVertexLabels(vertices, count);
    }

    if (options.center && options.triangle && options.nearestSide) {
      const triangleTransform = this.getCanvasTransform(options.triangle, 30);
      if (triangleTransform) {
        const centerCanvas = this.transformPointToCanvas(options.center, triangleTransform);
        const sideStart = this.transformPointToCanvas(options.nearestSide.start, triangleTransform);
        const sideEnd = this.transformPointToCanvas(options.nearestSide.end, triangleTransform);
        const projection = this.projectPointToSegment(centerCanvas, sideStart, sideEnd);

        const isProjectionSelected = this.highlightedSideIndex === 'projection';
        const isSideSelected = this.highlightedSideIndex !== null && this.highlightedSideIndex !== 'projection';

        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = isProjectionSelected ? '#f59e0b' : '#f59e0b';
        ctx.lineWidth = isProjectionSelected ? 2.8 : 2;
        ctx.moveTo(centerCanvas.x, centerCanvas.y);
        ctx.lineTo(projection.x, projection.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(projection.x, projection.y);
        ctx.lineTo(sideStart.x, sideStart.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(projection.x, projection.y);
        ctx.lineTo(sideEnd.x, sideEnd.y);
        ctx.stroke();

        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(projection.x, projection.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();

        this.drawCanvasText('H', projection.x + 8, projection.y - 8, '#b45309', 'bold 12px Segoe UI', 'left');

        const phLength = this.distanceBetween(options.center, options.nearestSide.projection);
        const midpointPH = { x: (centerCanvas.x + projection.x) / 2, y: (centerCanvas.y + projection.y) / 2 };
        const labelPH = `PH = ${this.formatMeter(phLength)}`;
        const labelOffset = 22;
        if (isProjectionSelected || this.highlightedSideIndex === null) {
          this.drawCanvasText(labelPH, midpointPH.x, midpointPH.y - labelOffset, '#b45309', 'bold 11px Segoe UI', 'center', 'rgba(255,255,255,0.9)');
        }

        const hToStart = this.distanceBetween(options.nearestSide.projection, options.nearestSide.start);
        const hToEnd = this.distanceBetween(options.nearestSide.projection, options.nearestSide.end);

        const midStart = { x: (projection.x + sideStart.x) / 2, y: (projection.y + sideStart.y) / 2 };
        const midEnd = { x: (projection.x + sideEnd.x) / 2, y: (projection.y + sideEnd.y) / 2 };

        if (isProjectionSelected || this.highlightedSideIndex === null || isSideSelected) {
          this.drawCanvasText(`${options.nearestSide.startLabel}H = ${this.formatMeter(hToStart)}`, midStart.x, midStart.y - 14, '#0f172a', 'bold 11px Segoe UI', 'center', 'rgba(255,255,255,0.9)');
          this.drawCanvasText(`${options.nearestSide.endLabel}H = ${this.formatMeter(hToEnd)}`, midEnd.x, midEnd.y - 14, '#0f172a', 'bold 11px Segoe UI', 'center', 'rgba(255,255,255,0.9)');
        }

        ctx.beginPath();
        ctx.arc(centerCanvas.x, centerCanvas.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();

        this.drawCanvasText('P', centerCanvas.x + 8, centerCanvas.y - 8, '#991b1b', 'bold 12px Segoe UI', 'left');
      }
    }

    if (!vertices.length) {
      ctx.font = '16px Segoe UI';
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'center';
      ctx.fillText('Nhập độ dài các cạnh để xem hình đa giác', canvas.width / 2, canvas.height / 2);
      ctx.textAlign = 'start';
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
