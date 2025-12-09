// Polygon overlay helpers for area outlines and higher-level area clusters.
export function buildAreaClusters(nodes, areaStyle = {}, clusterDefinitions = []) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  if (Array.isArray(clusterDefinitions) && clusterDefinitions.length) {
    return clusterDefinitions
      .map((cluster) => {
        const areaId = cluster.areaId || cluster.id;
        const areaNode = nodesById.get(areaId);
        const nodeIds = (cluster.nodes || []).filter((id) => nodesById.has(id));
        return {
          id: areaId,
          label: cluster.label || areaNode?.label || areaId,
          nodeIds,
          stroke: cluster.stroke || cluster.border || areaNode?.border || areaStyle.border || areaStyle.color || "#9bb7ff",
          fill: cluster.fill || areaNode?.fill || areaStyle.fill || "rgba(155, 183, 255, 0.1)",
          padding: cluster.padding ?? areaNode?.clusterPadding ?? 55
        };
      })
      .filter((cluster) => cluster.nodeIds.length);
  }

  const clusters = new Map();
  nodes.forEach((node) => {
    if (node.type === "area") {
      clusters.set(node.id, {
        id: node.id,
        label: node.label || node.id,
        nodeIds: [],
        stroke: node.border || areaStyle.border || areaStyle.color || "#9bb7ff",
        fill: node.fill || areaStyle.fill || "rgba(155, 183, 255, 0.1)",
        padding: node.clusterPadding || 55
      });
    }
  });
  nodes.forEach((node) => {
    if (!node.areaId || node.type === "area") {
      return;
    }
    const cluster = clusters.get(node.areaId);
    if (cluster) {
      cluster.nodeIds.push(node.id);
    }
  });
  return Array.from(clusters.values());
}

export function buildAreaClusterGroups(areaClusters = [], nodes = [], areaStyle = {}) {
  if (!Array.isArray(areaClusters) || !areaClusters.length) {
    return [];
  }
  const nodeList = Array.isArray(nodes) ? nodes : [];
  const clusters = [];
  areaClusters.forEach((cluster) => {
    const nodeIdsSet = new Set();
    (cluster.areaIds || []).forEach((areaId) => {
      nodeList.forEach((node) => {
        if (node.id === areaId || node.areaId === areaId) {
          nodeIdsSet.add(node.id);
        }
      });
      nodeIdsSet.add(areaId);
    });
    if (nodeIdsSet.size) {
      clusters.push({
        id: cluster.id || Array.from(nodeIdsSet).join("-"),
        label: cluster.label || cluster.id || "Area cluster",
        nodeIds: Array.from(nodeIdsSet),
        stroke: cluster.stroke || areaStyle.border || areaStyle.color || "#9bb7ff",
        fill: cluster.fill || areaStyle.fill || "rgba(155, 183, 255, 0.08)",
        padding: cluster.padding ?? 110
      });
    }
  });
  return clusters;
}

export function createClusterOverlay(container, clusters = []) {
  if (!clusters.length || !container) {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.className = "cluster-overlay";
  container.prepend(canvas);
  const ctx = canvas.getContext("2d");
  const polygons = new Map();
  let cy = null;
  let width = 0;
  let height = 0;
  let visible = true;
  let selectedAreaId = null;
  let hoveredAreaId = null;
  let rafId = null;
  let renderHandler = null;
  let eligibleNodes = null;

  const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => resizeCanvas()) : null;
  if (resizeObserver) {
    resizeObserver.observe(container);
  } else {
    window.addEventListener("resize", resizeCanvas);
  }
  resizeCanvas();

  function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    requestRender();
  }

  function requestRender() {
    if (!cy || rafId) {
      return;
    }
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      render();
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    polygons.clear();
    if (!visible || !cy) {
      return;
    }
    const ordered = clusters
      .slice()
      .sort((a, b) => (b.nodeIds.length || 0) - (a.nodeIds.length || 0));
    ordered.forEach((cluster) => {
      const points = gatherClusterPoints(cluster.nodeIds);
      if (!points.length) {
        return;
      }
      const polygon = buildClusterPolygon(points, cluster.padding);
      if (!polygon.length) {
        return;
      }
      polygons.set(cluster.id, polygon);
      drawCluster(polygon, cluster);
    });
  }

  function gatherClusterPoints(nodeIds) {
    const pts = [];
    nodeIds.forEach((nodeId) => {
      if (eligibleNodes && !eligibleNodes.has(nodeId)) {
        return;
      }
      const el = cy.getElementById(nodeId);
      if (!el || !el.length || el.removed()) {
        return;
      }
      let pos = el.renderedPosition();
      if (!pos || Number.isNaN(pos.x) || Number.isNaN(pos.y)) {
        const model = el.position();
        if (model) {
          pos = {
            x: model.x * cy.zoom() + cy.pan().x,
            y: model.y * cy.zoom() + cy.pan().y
          };
        }
      }
      if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
        pts.push(pos);
      }
    });
    return pts;
  }

  function drawCluster(points, cluster) {
    ctx.save();
    ctx.beginPath();
    points.forEach((point, idx) => {
      if (idx === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();
    const fillBase = cluster.fill || "rgba(155, 183, 255, 0.08)";
    const strokeBase = cluster.stroke || "#9bb7ff";
    const isActive = cluster.id === selectedAreaId;
    const isHover = cluster.id === hoveredAreaId && !isActive;
    ctx.fillStyle = isActive ? withAlpha(fillBase, 0.35) : isHover ? withAlpha(fillBase, 0.25) : fillBase;
    ctx.strokeStyle = strokeBase;
    ctx.lineWidth = isActive ? 3 : isHover ? 2.5 : 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.fill();
    ctx.stroke();
    if (cluster.label) {
      const centroid = polygonCentroid(points);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = "600 14px Inter, 'Segoe UI', system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cluster.label, centroid.x, centroid.y);
    }
    ctx.restore();
  }

  function buildClusterPolygon(points, padding = 55) {
    if (!points.length) {
      return [];
    }
    if (points.length === 1) {
      return buildCirclePolygon(points[0], padding + 20);
    }
    if (points.length === 2) {
      return buildCapsulePolygon(points[0], points[1], padding);
    }
    const hull = convexHull(points);
    return inflateHull(hull, padding);
  }

  function buildCirclePolygon(center, radius) {
    const steps = 16;
    const poly = [];
    for (let i = 0; i < steps; i += 1) {
      const angle = (i / steps) * Math.PI * 2;
      poly.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });
    }
    return poly;
  }

  function buildCapsulePolygon(a, b, padding) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const extension = padding * 0.8;
    const halfWidth = Math.max(padding * 0.6, 35);
    const start = { x: a.x - ux * extension, y: a.y - uy * extension };
    const end = { x: b.x + ux * extension, y: b.y + uy * extension };
    return [
      { x: start.x + nx * halfWidth, y: start.y + ny * halfWidth },
      { x: end.x + nx * halfWidth, y: end.y + ny * halfWidth },
      { x: end.x - nx * halfWidth, y: end.y - ny * halfWidth },
      { x: start.x - nx * halfWidth, y: start.y - ny * halfWidth }
    ];
  }

  function convexHull(points) {
    const sorted = points
      .slice()
      .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
    if (sorted.length <= 1) {
      return sorted;
    }
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    sorted.forEach((point) => {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
        lower.pop();
      }
      lower.push(point);
    });
    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
      const point = sorted[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
        upper.pop();
      }
      upper.push(point);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }

  function inflateHull(points, padding) {
    if (!points.length) {
      return [];
    }
    const centroid = polygonCentroid(points);
    return points.map((point) => {
      const vx = point.x - centroid.x;
      const vy = point.y - centroid.y;
      const length = Math.hypot(vx, vy) || 1;
      const scale = (length + padding) / length;
      return { x: centroid.x + vx * scale, y: centroid.y + vy * scale };
    });
  }

  function polygonCentroid(points) {
    if (!points.length) {
      return { x: 0, y: 0 };
    }
    const sum = points.reduce(
      (acc, point) => {
        acc.x += point.x;
        acc.y += point.y;
        return acc;
      },
      { x: 0, y: 0 }
    );
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  function findAreaAtPoint(point) {
    if (!visible || !point) {
      return null;
    }
    for (const [areaId, polygon] of polygons.entries()) {
      if (polygon.length && pointInPolygon(point, polygon)) {
        return areaId;
      }
    }
    return null;
  }

  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      const intersects =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi;
      if (intersects) {
        inside = !inside;
      }
    }
    return inside;
  }

  return {
    attach(instance) {
      cy = instance;
      if (!renderHandler) {
        renderHandler = () => requestRender();
      }
      cy.on("render zoom pan", renderHandler);
      requestRender();
    },
    destroy() {
      if (renderHandler && cy) {
        cy.off("render zoom pan", renderHandler);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", resizeCanvas);
      }
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      canvas.remove();
      polygons.clear();
      cy = null;
    },
    setVisibility(value) {
      visible = !!value;
      requestRender();
    },
    setSelection(areaId) {
      selectedAreaId = areaId;
      requestRender();
    },
    setHover(areaId) {
      hoveredAreaId = areaId;
      requestRender();
    },
    setEligibleNodes(nodeSet) {
      eligibleNodes = nodeSet || null;
      requestRender();
    },
    sync() {
      requestRender();
    },
    findAreaAtPoint
  };
}

function withAlpha(color, alpha) {
  if (!color) {
    return `rgba(155, 183, 255, ${alpha})`;
  }
  if (color.startsWith("rgba")) {
    return color.replace(/rgba\(([^)]+)\)/, (_, inner) => {
      const parts = inner.split(",").map((part) => part.trim());
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    });
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(/\)$/, `, ${alpha})`);
  }
  if (color.startsWith("#")) {
    const rgb = hexToRgb(color);
    if (rgb) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }
  }
  return color;
}

function hexToRgb(value) {
  const hex = value.replace("#", "");
  if (!(hex.length === 3 || hex.length === 6)) {
    return null;
  }
  const normalized = hex.length === 3 ? hex.split("").map((ch) => ch + ch).join("") : hex;
  const num = parseInt(normalized, 16);
  if (Number.isNaN(num)) {
    return null;
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}
