import { config } from './config.js';
import { applyRadialLayout } from './layout.js';
import { buildAreaClusters, buildAreaClusterGroups, createClusterOverlay } from './overlays.js';
import { initFilters } from './filters.js';
import { detailRank, currentDetail, clamp, extractLevels } from './utils.js';

(() => {
  const runtime = { cy: null, clusterOverlays: [] };
  const datasetSelectEl = document.getElementById("dataset-select");
  const uploadInputEl = document.getElementById("data-upload");
  const zoomButtons = document.querySelectorAll(".zoom-buttons button");
  const defaultInfoHtml = `
    <div class="info-panel__empty">
      <h2>Select a node</h2>
      <p>Zoom to reveal layers (area → topic → atomic goal). Use the dataset switcher to explore different files.</p>
    </div>
  `;

  setupDatasetControls();
  setupZoomButtons();
  loadDataset(config.defaultDataset || config.datasets[0]?.value);

  // Populate dataset dropdown + upload handler so users can switch data sources.
  function setupDatasetControls() {
    if (datasetSelectEl) {
      datasetSelectEl.innerHTML = "";
      config.datasets.forEach(({ label, value }) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        datasetSelectEl.appendChild(option);
      });
      const defaultValue = config.defaultDataset || (config.datasets[0] && config.datasets[0].value) || "";
      datasetSelectEl.value = defaultValue;
      datasetSelectEl.addEventListener("change", () => {
        if (datasetSelectEl.value) {
          loadDataset(datasetSelectEl.value);
        }
      });
    }
    if (uploadInputEl) {
      uploadInputEl.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) {
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            if (datasetSelectEl) {
              datasetSelectEl.value = "";
            }
            loadDataset({ inline: data });
          } catch (error) {
            console.error("Failed to parse uploaded JSON", error);
            alert("JSON soubor se nepodařilo načíst.");
          }
        };
        reader.readAsText(file);
        event.target.value = "";
      });
    }
  }

  // Manual zoom buttons complement cytoscape's scrollwheel zoom.
  function setupZoomButtons() {
    zoomButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!runtime.cy) {
          return;
        }
        const direction = btn.dataset.zoom === "in" ? 1 : -1;
        const factor = Math.pow(1.2, direction);
        const targetZoom = clamp(runtime.cy.zoom() * factor, runtime.cy.minZoom(), runtime.cy.maxZoom());
        runtime.cy.zoom({
          level: targetZoom,
          renderedPosition: {
            x: runtime.cy.width() / 2,
            y: runtime.cy.height() / 2
          }
        });
      });
    });
  }

  // Load data either from preset URL or inline upload and hand off to renderer.
  function loadDataset(source) {
    if (!source) {
      console.warn("No dataset specified");
      return;
    }
    if (typeof source === "string") {
      fetch(source)
        .then((resp) => {
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
          }
          return resp.json();
        })
        .then((data) => renderDataset(data))
        .catch((error) => {
          console.error(`Failed to load ${source}`, error);
          alert(`Datový soubor ${source} se nepodařilo načíst.`);
        });
      return;
    }
    if (source.inline) {
      renderDataset(source.inline);
    }
  }

  function renderDataset(data) {
    teardown();
    const result = initCytoscape(data);
    runtime.cy = result?.cy || null;
    runtime.clusterOverlays = result?.clusterOverlays || [];
  }

  function teardown() {
    if (runtime.cy) {
      runtime.cy.destroy();
      runtime.cy = null;
    }
    if (runtime.clusterOverlays?.length) {
      runtime.clusterOverlays.forEach((overlay) => overlay?.destroy?.());
      runtime.clusterOverlays = [];
    }
    const infoPanel = document.getElementById("info-panel");
    if (infoPanel) {
      infoPanel.innerHTML = defaultInfoHtml;
    }
  }

  // Spin up a Cytoscape instance with overlays, filters, and interaction wiring.
  function initCytoscape(conceptData) {
    const container = document.getElementById("concept-map");
    const infoPanel = document.getElementById("info-panel");
    const zoomReadout = document.getElementById("zoom-readout");
    const typeFilterEl = document.getElementById("type-filter");
    const expertiseFilterEl = document.getElementById("expertise-filter");
    if (!container || !conceptData) {
      console.warn("Missing container or data");
      return;
    }

    const expertiseOrder = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const filters = {
      types: new Set(["areaCluster", "area", "topic", "educationalGoal", "atomicGoal", "activity", "term"]),
      expertise: new Set()
    };

    const clusterDefinitions = Array.isArray(conceptData.clusters) ? conceptData.clusters : [];
    const nodes = (conceptData.nodes || [])
      .map(normalizeNode)
      .map((node) => {
        const detailLevel = config.detailByType[node.type] || "close";
        return {
          ...node,
          levels: extractLevels(node.expertise, expertiseOrder),
          detailLevel,
          detailRank: detailRank(detailLevel)
        };
      });
    const edges = (conceptData.edges || []).map((edge) => ({
      ...edge,
      relation: edge.type || edge.relation || "related"
    }));
    const nodesById = new Map(nodes.map((n) => [n.id, n]));
    assignAreaMembership(nodes, edges, nodesById, clusterDefinitions);
    applyRadialLayout(nodes, edges, nodesById, clusterDefinitions);
    const adjacency = buildAdjacency(nodes, edges);

    const renderableNodes = nodes.filter((node) => node.type !== "area");
    const renderableEdges = edges.filter((edge) => {
      const src = nodesById.get(edge.source);
      const tgt = nodesById.get(edge.target);
      return src?.type !== "area" && tgt?.type !== "area";
    });

    initFilters(nodes, filters, typeFilterEl, expertiseFilterEl, expertiseOrder, applyFilters);

    const cy = cytoscape({
      container,
      elements: buildElements(renderableNodes, renderableEdges),
      style: buildStyles(config),
      layout: { name: "cose", padding: 40 },
      minZoom: 0.3,
      maxZoom: 2.5,
      wheelSensitivity: 0.2,
      autoungrabify: true,
      boxSelectionEnabled: false
    });

    const areaClusters = buildAreaClusters(nodes, config.nodeStyles.area || {}, clusterDefinitions);
    const areaClusterGroups = buildAreaClusterGroups(conceptData.areaClusters, nodes, config.nodeStyles.area || {});

    const overlays = {
      area: areaClusters.length ? createClusterOverlay(container, areaClusters) : null,
      areaCluster: areaClusterGroups.length ? createClusterOverlay(container, areaClusterGroups) : null
    };
    const overlayList = Object.values(overlays).filter(Boolean);
    overlayList.forEach((overlay) => overlay.attach(cy));

    const state = { selectedId: null, detailLevel: currentDetail(cy.zoom()) };
    const areaOverlay = overlays.area;
    const areaClusterOverlay = overlays.areaCluster;
    updateZoomReadout();
    applyFilters();
    renderInfo(null);

    cy.on("tap", "node", (evt) => {
      evt.preventDefault();
      const id = evt.target.id();
      setSelected(id);
    });

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        if (areaOverlay && evt.renderedPosition) {
          const areaHit = areaOverlay.findAreaAtPoint(evt.renderedPosition);
          if (areaHit) {
            setSelected(areaHit);
            return;
          }
        }
        setSelected(null);
      }
    });

    cy.on("mouseover", "node", (evt) => {
      highlight(evt.target);
    });
    cy.on("mouseout", "node", () => clearHover());

    cy.on("zoom", () => {
      state.detailLevel = currentDetail(cy.zoom());
      updateZoomReadout();
      applyFilters();
    });

    function applyFilters() {
      const overlayEligible = new Set();
      cy.batch(() => {
        renderableNodes.forEach((node) => {
          const nodeEl = cy.getElementById(node.id);
          const typeVisible = filters.types.has(node.type);
          const expVisible = node.levels.length === 0 || node.levels.some((l) => filters.expertise.has(l));
          const lodVisible = detailRank(node.detailLevel) <= detailRank(state.detailLevel);
          const baseVisible = typeVisible && expVisible;
          nodeEl.toggleClass("is-hidden", !(baseVisible && lodVisible));
          if (baseVisible) {
            overlayEligible.add(node.id);
          }
        });
        renderableEdges.forEach((edge) => {
          const e = cy.getElementById(edge.id);
          const srcVisible = !cy.getElementById(edge.source).hasClass("is-hidden");
          const tgtVisible = !cy.getElementById(edge.target).hasClass("is-hidden");
          e.toggleClass("is-hidden", !(srcVisible && tgtVisible));
        });
      });
      if (state.selectedId && cy.getElementById(state.selectedId).hasClass("is-hidden")) {
        setSelected(null);
      }
      if (areaOverlay) {
        const areaDetail = config.detailByType.area || "area";
        const areaAllowed = detailRank(areaDetail) <= detailRank(state.detailLevel);
        areaOverlay.setVisibility(filters.types.has("area") && areaAllowed);
        areaOverlay.setEligibleNodes(overlayEligible);
        areaOverlay.sync();
      }
      if (areaClusterOverlay) {
        const clusterDetail = config.detailByType.areaCluster || "cluster";
        const overlayAllowed = detailRank(clusterDetail) <= detailRank(state.detailLevel);
        areaClusterOverlay.setVisibility(filters.types.has("areaCluster") && overlayAllowed);
        areaClusterOverlay.setEligibleNodes(overlayEligible);
        areaClusterOverlay.sync();
      }
    }

    function setSelected(id) {
      if (state.selectedId) {
        const prev = cy.getElementById(state.selectedId);
        if (prev && prev.length) {
          prev.removeClass("is-selected");
        }
      }
      state.selectedId = id;
      if (id) {
        const el = cy.getElementById(id);
        if (el && el.length) {
          el.addClass("is-selected");
        }
      }
      const selectedNode = id ? nodesById.get(id) : null;
      if (areaOverlay) {
        const targetArea = selectedNode?.type === "area" ? selectedNode.id : selectedNode?.areaId;
        areaOverlay.setSelection(targetArea || null);
      }
      renderInfo(selectedNode || null);
    }

    function renderInfo(node) {
      infoPanel.innerHTML = "";
      if (!node) {
        infoPanel.innerHTML = defaultInfoHtml;
        return;
      }
      const header = document.createElement("div");
      header.className = "detail-header";
      const pill = document.createElement("span");
      pill.className = "detail-pill";
      pill.textContent = node.type.toUpperCase();
      const title = document.createElement("h2");
      title.textContent = node.label;
      header.appendChild(pill);
      header.appendChild(title);
      infoPanel.appendChild(header);

      const metaParts = [];
      if (node.expertise) metaParts.push(`Expertise ${node.expertise}`);
      if (node.bloomsLevel) metaParts.push(`Bloom ${node.bloomsLevel}`);
      if (node.level && node.type === "topic") metaParts.push(`Level ${node.level}`);
      if (metaParts.length) {
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = metaParts.join(" | ");
        infoPanel.appendChild(meta);
      }

      const desc = document.createElement("p");
      desc.textContent = node.fullText || node.definition || node.description || node.content?.prompt || "";
      if (desc.textContent) infoPanel.appendChild(desc);

      const connections = adjacency.get(node.id) || [];
      if (connections.length) {
        const section = document.createElement("div");
        section.className = "detail-section";
        const h3 = document.createElement("h3");
        h3.textContent = "Connections";
        section.appendChild(h3);
        const list = document.createElement("ul");
        connections.forEach(({ nodeId, relation }) => {
          const other = nodesById.get(nodeId);
          if (!other) return;
          const li = document.createElement("li");
          li.textContent = `${relation}: ${other.label}`;
          list.appendChild(li);
        });
        section.appendChild(list);
        infoPanel.appendChild(section);
      }
    }

    function highlight(el) {
      clearHover();
      el.addClass("is-focused");
      const neigh = el.closedNeighborhood();
      neigh.nodes().addClass("is-linked");
      neigh.edges().addClass("is-linked");
      if (areaOverlay) {
        const nodeData = nodesById.get(el.id());
        const hoverArea = nodeData?.type === "area" ? nodeData.id : nodeData?.areaId;
        areaOverlay.setHover(hoverArea || null);
      }
    }

    function clearHover() {
      cy.elements().removeClass("is-focused is-linked");
      areaOverlay?.setHover(null);
    }

    function updateZoomReadout() {
      if (!zoomReadout) return;
      zoomReadout.textContent = `${Math.round(cy.zoom() * 100)}%`;
    }

    return { cy, clusterOverlays: overlayList };
  }

  function normalizeNode(node) {
    if (node.type === "topic" && node.metadata?.isTopLevelArea) {
      return { ...node, type: "area" };
    }
    return node;
  }

  function buildAdjacency(nodes, edges) {
    const map = new Map();
    edges.forEach((edge) => {
      [edge.source, edge.target].forEach((id) => {
        if (!map.has(id)) map.set(id, []);
        map.get(id).push({ nodeId: id === edge.source ? edge.target : edge.source, relation: edge.relation });
      });
    });
    return map;
  }

  function buildElements(nodes, edges) {
    const nodeElements = nodes.map((node) => {
      const style = config.nodeStyles[node.type] || config.nodeStyles.atomicGoal;
      return {
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          detailLevel: node.detailLevel,
          detailRank: detailRank(node.detailLevel),
          width: style.size,
          height: style.size,
          shape: style.shape,
          areaId: node.areaId || null
        },
        position: node.x != null && node.y != null ? { x: node.x, y: node.y } : undefined,
        classes: [`node-${node.type}`, `detail-${node.detailLevel}`].join(" ")
      };
    });
    const edgeElements = edges.map((edge) => ({
      data: { id: edge.id, source: edge.source, target: edge.target, relation: edge.relation },
      classes: `edge-${edge.relation}`
    }));
    return [...nodeElements, ...edgeElements];
  }

  function assignAreaMembership(nodes, edges, nodesById, clusterDefinitions = []) {
    if (!nodes?.length) {
      return;
    }
    const clusterOverrides = new Map();
    if (Array.isArray(clusterDefinitions)) {
      clusterDefinitions.forEach((cluster) => {
        const areaId = cluster.areaId || cluster.id;
        (cluster.nodes || []).forEach((nodeId) => {
          clusterOverrides.set(nodeId, areaId);
        });
      });
    }
    const hierarchyParents = new Map();
    edges.forEach((edge) => {
      if (edge.relation === "isPartOf") {
        hierarchyParents.set(edge.source, edge.target);
      }
    });
    const memo = new Map();
    nodes.forEach((node) => {
      if (node.type === "area") {
        node.areaId = node.id;
        memo.set(node.id, node.id);
      }
    });

    function resolve(nodeId, seen = new Set()) {
      if (!nodeId || seen.has(nodeId)) {
        return null;
      }
      if (memo.has(nodeId)) {
        return memo.get(nodeId);
      }
      const node = nodesById.get(nodeId);
      if (!node) {
        return null;
      }
      seen.add(nodeId);
      if (node.type === "area") {
        memo.set(nodeId, nodeId);
        seen.delete(nodeId);
        return nodeId;
      }
      const candidates = [
        clusterOverrides.get(node.id),
        node.areaId,
        node.metadata?.areaId,
        node.parentTopicId,
        node.metadata?.parentTopicId,
        node.topicId,
        node.metadata?.topicId,
        hierarchyParents.get(nodeId)
      ].filter(Boolean);
      for (const candidate of candidates) {
        const resolved = resolve(candidate, seen);
        if (resolved) {
          memo.set(nodeId, resolved);
          node.areaId = resolved;
          seen.delete(nodeId);
          return resolved;
        }
      }
      memo.set(nodeId, null);
      seen.delete(nodeId);
      return null;
    }

    nodes.forEach((node) => {
      if (node.type === "area") {
        return;
      }
      const resolved = resolve(node.id, new Set());
      if (resolved) {
        node.areaId = resolved;
      }
    });
  }

  function buildStyles(cfg) {
    // derive ranking from configured zoomBreaks so code responds to added/removed breaks
    const rankKeys = Object.keys(cfg.zoomBreaks || {}).sort((a, b) => (cfg.zoomBreaks[a] || 0) - (cfg.zoomBreaks[b] || 0));
    const maxRank = Math.max(0, rankKeys.length - 1);
    const fontSizeExpr = `mapData(detailRank, 0, ${maxRank}, 16, 10)`;
    const textMaxWidthExpr = `mapData(detailRank, 0, ${maxRank}, 220, 90)`;

    const baseNode = {
      label: "data(label)",
      "font-size": fontSizeExpr,
      "font-family": "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif",
      "text-valign": "center",
      "text-halign": "center",
      "text-wrap": "wrap",
      "text-max-width": textMaxWidthExpr,
      "text-outline-width": 0,
      "background-color": "transparent",
      "border-width": 2,
      width: "data(width)",
      height: "data(height)",
      shape: "data(shape)"
    };

    const styles = [
      { selector: "node", style: baseNode },
      ...Object.entries(cfg.nodeStyles).map(([key, val]) => ({
        selector: `.node-${key}`,
        style: {
          "background-color": val.fill || "transparent",
          "border-color": val.border,
          "border-style": val.borderStyle || "solid",
          color: val.labelColor || val.color || "#f5f5f5",
          width: val.size,
          height: val.size,
          shape: val.shape,
          "border-radius": val.borderRadius || 0
        }
      })),
      { selector: "edge", style: { width: 2, "line-color": "rgba(255,255,255,0.2)", "curve-style": "straight" } },
      ...Object.entries(cfg.edgeStyles).map(([rel, val]) => ({
        selector: `.edge-${rel}`,
        style: {
          "line-color": val.color,
          width: val.width,
          "line-style": val.dash ? "dashed" : "solid",
          "line-dash-pattern": val.dash || []
        }
      })),
      { selector: ".is-hidden", style: { display: "none" } },
      { selector: "node.is-selected", style: { "border-width": 4, "border-color": "#fff" } },
      { selector: "node.is-focused", style: { "border-color": "#fff", "border-width": 3 } },
      { selector: "node.is-linked", style: { "border-color": "#fff" } },
      { selector: "edge.is-linked", style: { "line-color": "#fff", width: 3 } }
    ];
      return styles;
    }
  })();

