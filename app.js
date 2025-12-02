(() => {
  const config = {
    zoomBreaks: { wide: 0.6, mid: 1.2 },
    detailByType: {
      area: "wide",
      topic: "mid",
      educationalGoal: "mid",
      atomicGoal: "close",
      term: "close",
      activity: "close"
    },
    nodeStyles: {
      area: { color: "#9bb7ff", border: "#9bb7ff", fill: "rgba(155, 183, 255, 0.1)", borderStyle: "dashed", size: 260, shape: "ellipse" },
      topic: { color: "#8fd3c8", border: "#8fd3c8", fill: "rgba(143, 211, 200, 0.15)", size: 150, shape: "ellipse" },
      educationalGoal: { color: "#ffb347", border: "#ffb347", size: 110, shape: "ellipse" },
      atomicGoal: { color: "#a277ff", border: "#a277ff", size: 70, shape: "ellipse" },
      term: { color: "#7ee0ff", border: "#7ee0ff", size: 60, shape: "diamond" },
      activity: { color: "#ff7ea9", border: "#ff7ea9", size: 70, shape: "roundrectangle", borderRadius: 16 }
    },
    edgeStyles: {
      validates: { color: "#ff7ea9", width: 3, dash: [6, 6] },
      requiresUnderstanding: { color: "#7ee0ff", width: 2, dash: [6, 4] },
      aggregates: { color: "#ffb347", width: 3, dash: [4, 3] },
      isPartOf: { color: "#9bb7ff", width: 2 },
      prerequisite: { color: "#a277ff", width: 2.5, dash: [8, 4] },
      reinforces: { color: "#8fd3c8", width: 2, dash: [5, 3] },
      exemplifies: { color: "#7ee0ff", width: 2, dash: [3, 2] }
    },
    datasets: [
      { label: "Simple demo", value: "simpledata.json" },
      { label: "Dataset 1", value: "data1.json" },
      { label: "Dataset 2", value: "data2.json" }
    ],
    defaultDataset: "simpledata.json"
  };

  const runtime = { cy: null };
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
    runtime.cy = initCytoscape(data);
  }

  function teardown() {
    if (runtime.cy) {
      runtime.cy.destroy();
      runtime.cy = null;
    }
    const infoPanel = document.getElementById("info-panel");
    if (infoPanel) {
      infoPanel.innerHTML = defaultInfoHtml;
    }
  }

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
      types: new Set(["area", "topic", "educationalGoal", "atomicGoal", "activity", "term"]),
      expertise: new Set()
    };

    const nodes = conceptData.nodes
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
    applyRadialLayout(nodes, edges, nodesById);
    const adjacency = buildAdjacency(nodes, edges);

    initFilters(nodes, filters, typeFilterEl, expertiseFilterEl, expertiseOrder, applyFilters);

    const cy = cytoscape({
      container,
      elements: buildElements(nodes, edges),
      style: buildStyles(config),
      layout: { name: "cose", padding: 40 },
      minZoom: 0.3,
      maxZoom: 2.5,
      wheelSensitivity: 0.2,
      autoungrabify: true,
      boxSelectionEnabled: false
    });

    const state = { selectedId: null, detailLevel: currentDetail(cy.zoom()) };
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
      cy.batch(() => {
        nodes.forEach((node) => {
          const nodeEl = cy.getElementById(node.id);
          const typeVisible = filters.types.has(node.type);
          const expVisible = node.levels.length === 0 || node.levels.some((l) => filters.expertise.has(l));
          const lodVisible = detailRank(node.detailLevel) <= detailRank(state.detailLevel);
          nodeEl.toggleClass("is-hidden", !(typeVisible && expVisible && lodVisible));
        });
        edges.forEach((edge) => {
          const e = cy.getElementById(edge.id);
          const srcVisible = !cy.getElementById(edge.source).hasClass("is-hidden");
          const tgtVisible = !cy.getElementById(edge.target).hasClass("is-hidden");
          e.toggleClass("is-hidden", !(srcVisible && tgtVisible));
        });
      });
      if (state.selectedId && cy.getElementById(state.selectedId).hasClass("is-hidden")) {
        setSelected(null);
      }
    }

    function setSelected(id) {
      if (state.selectedId) cy.getElementById(state.selectedId).removeClass("is-selected");
      state.selectedId = id;
      if (id) cy.getElementById(id).addClass("is-selected");
      renderInfo(id ? nodesById.get(id) : null);
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
    }

    function clearHover() {
      cy.elements().removeClass("is-focused is-linked");
    }

    function updateZoomReadout() {
      if (!zoomReadout) return;
      zoomReadout.textContent = `${Math.round(cy.zoom() * 100)}%`;
    }

    return cy;
  }

  function initFilters(nodes, filters, typeFilterEl, expertiseFilterEl, expertiseOrder, onChange) {
    const levelOptions = Array.from(
      new Set(
        nodes.flatMap((node) => extractLevels(node.expertise, expertiseOrder))
      )
    ).sort((a, b) => expertiseOrder.indexOf(a) - expertiseOrder.indexOf(b));
    if (levelOptions.length === 0) levelOptions.push("A1");
    levelOptions.forEach((level) => filters.expertise.add(level));

    if (typeFilterEl) {
      createChips(typeFilterEl, [
        { key: "area", label: "Areas" },
        { key: "topic", label: "Topics" },
        { key: "educationalGoal", label: "Educational goals" },
        { key: "atomicGoal", label: "Atomic goals" },
        { key: "activity", label: "Activities" },
        { key: "term", label: "Terms" }
      ], filters.types, onChange);
    }

    if (expertiseFilterEl) {
      createChips(
        expertiseFilterEl,
        levelOptions.map((level) => ({ key: level, label: level })),
        filters.expertise,
        onChange
      );
    }
  }

  function createChips(container, items, activeSet, onChange) {
    container.innerHTML = "";
    items.forEach(({ key, label }) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip is-active";
      chip.dataset.value = key;
      chip.textContent = label;
      chip.addEventListener("click", () => {
        const active = chip.classList.contains("is-active");
        if (active && activeSet.size <= 1) return;
        chip.classList.toggle("is-active");
        if (active) {
          activeSet.delete(key);
        } else {
          activeSet.add(key);
        }
        onChange?.();
      });
      container.appendChild(chip);
    });
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
          shape: style.shape
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

  function buildStyles(cfg) {
    const baseNode = {
      label: "data(label)",
      "font-size": "mapData(detailRank, 0, 2, 14, 10)",
      "font-family": "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif",
      "text-valign": "center",
      "text-halign": "center",
      "text-wrap": "wrap",
      "text-max-width": "mapData(detailRank, 0, 2, 200, 110)",
      color: "#f5f5f5",
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

  function applyRadialLayout(nodes, edges, nodesById) {
    const areas = nodes.filter((n) => n.type === "area");
    const topics = nodes.filter((n) => n.type === "topic");
    const eduGoals = nodes.filter((n) => n.type === "educationalGoal");
    const centerX = 600;
    const centerY = 400;
    const areaRadius = 260;

    areas.forEach((area, idx) => {
      const angle = areas.length <= 1 ? -Math.PI / 2 : (-Math.PI / 2) + (idx * (2 * Math.PI) / areas.length);
      area.x = centerX + areaRadius * Math.cos(angle);
      area.y = centerY + areaRadius * Math.sin(angle);
      area.radius = area.radius || 220;
    });

    const topicsByArea = new Map();
    topics.forEach((topic) => {
      const parentAreaId = topic.parentTopicId || findParentArea(topic.id, edges);
      if (!topicsByArea.has(parentAreaId)) topicsByArea.set(parentAreaId, []);
      topicsByArea.get(parentAreaId).push(topic.id);
    });

    topics.forEach((topic) => {
      const parentAreaId = topic.parentTopicId || findParentArea(topic.id, edges);
      const parentArea = areas.find((a) => a.id === parentAreaId) || areas[0];
      const siblings = topicsByArea.get(parentAreaId) || topics.map((t) => t.id);
      const idx = siblings.indexOf(topic.id);
      const baseAngle = siblings.length ? (-Math.PI / 2) + (idx * (2 * Math.PI) / siblings.length) : -Math.PI / 2;
      const ring = Math.max((parentArea?.radius || 200) * 0.6, 180);
      topic.x = (parentArea?.x || centerX) + ring * Math.cos(baseAngle);
      topic.y = (parentArea?.y || centerY) + ring * Math.sin(baseAngle);
      topic.radius = topic.radius || 140;
    });

    const aggregateChildren = new Map();
    const topicGoals = new Map();
    nodes.forEach((node) => {
      if (node.type === "atomicGoal") {
        if (!topicGoals.has(node.topicId)) topicGoals.set(node.topicId, []);
        topicGoals.get(node.topicId).push(node.id);
      }
    });

    edges.forEach((edge) => {
      if (edge.relation === "aggregates") {
        if (!aggregateChildren.has(edge.source)) aggregateChildren.set(edge.source, []);
        aggregateChildren.get(edge.source).push(edge.target);
      }
    });

    const goalAngles = new Map();
    topicGoals.forEach((goalIds, topicId) => {
      const topic = nodesById.get(topicId);
      if (!topic) return;
      const radius = Math.max((topic.radius || 140) - 40, 60);
      const step = (2 * Math.PI) / goalIds.length;
      goalIds.forEach((goalId, idx) => {
        const angle = -Math.PI / 2 + idx * step;
        const goal = nodesById.get(goalId);
        if (!goal) return;
        goal.x = topic.x + radius * Math.cos(angle);
        goal.y = topic.y + radius * Math.sin(angle);
        goalAngles.set(goalId, angle);
      });
    });

    const positionedAggregates = new Set();
    aggregateChildren.forEach((childIds, parentId) => {
      const parent = nodesById.get(parentId);
      if (!parent || !childIds.length) return;
      const parentRadius = getNodeRadius(parent);
      const angleStep = (2 * Math.PI) / childIds.length;
      childIds.forEach((childId, idx) => {
        const child = nodesById.get(childId);
        if (!child || positionedAggregates.has(childId)) return;
        const childRadius = getNodeRadius(child);
        const ring = Math.max(parentRadius - childRadius * 0.4, childRadius + 30);
        const angle = -Math.PI / 2 + idx * angleStep;
        child.x = (parent.x || centerX) + ring * Math.cos(angle);
        child.y = (parent.y || centerY) + ring * Math.sin(angle);
        positionedAggregates.add(childId);
      });
    });

    eduGoals.forEach((eg) => {
      const topic = nodesById.get(eg.topicId);
      if (topic) {
        eg.x = topic.x;
        eg.y = topic.y - (topic.radius || 140) + 40;
      }
    });

    edges.forEach((edge) => {
      const source = nodesById.get(edge.source);
      const target = nodesById.get(edge.target);
      if (!source || !target) return;
      if (edge.relation === "requiresUnderstanding" && source.type === "atomicGoal" && target.type === "term") {
        const topicId = source.topicId;
        const topic = topicId ? nodesById.get(topicId) : null;
        const angle = goalAngles.get(source.id) || 0;
        if (!topic) return;
        const base = (topic.radius || 120) + 50;
        const idx = (edge.metadata?.order || 0);
        target.x = topic.x + (base + idx * 25) * Math.cos(angle + 0.35);
        target.y = topic.y + (base + idx * 25) * Math.sin(angle + 0.35);
      }
      if (edge.relation === "validates" && source.type === "activity" && target.type === "atomicGoal") {
        const topicId = target.topicId;
        const topic = topicId ? nodesById.get(topicId) : null;
        const angle = goalAngles.get(target.id) || 0;
        if (!topic) return;
        const base = (topic.radius || 120) + 110;
        source.x = topic.x + (base) * Math.cos(angle - 0.4);
        source.y = topic.y + (base) * Math.sin(angle - 0.4);
      }
    });
  }

  function findParentArea(topicId, edges) {
    const edge = edges.find((e) => e.relation === "isPartOf" && e.source === topicId);
    return edge ? edge.target : null;
  }

  function getNodeRadius(node) {
    if (!node) return 60;
    if (node.radius) return node.radius;
    const size = config.nodeStyles[node.type]?.size || 80;
    return size / 2;
  }

  function currentDetail(zoom) {
    if (zoom <= config.zoomBreaks.wide) return "wide";
    if (zoom <= config.zoomBreaks.mid) return "mid";
    return "close";
  }

  function detailRank(level) {
    if (level === "wide") return 0;
    if (level === "mid") return 1;
    return 2;
  }

  function extractLevels(value = "", order) {
    const normalized = value.replace(/\s+/g, "").replace(/\u2013/g, "-");
    const parts = normalized.split("-");
    if (parts.length === 2) {
      const start = order.indexOf(parts[0]);
      const end = order.indexOf(parts[1]);
      if (start >= 0 && end >= start) return order.slice(start, end + 1);
    }
    const matches = normalized.match(/[A-C][1-2]/g);
    return matches || [];
  }

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }
})();
