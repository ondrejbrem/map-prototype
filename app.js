(() => {
  const config = {
    zoomBreaks: {
      cluster: 0.45,
      area: 0.7,
      topic: 1.0,
      goal: 1.3,
      detail: 1.65
    },
    detailByType: {
      areaCluster: "cluster",
      area: "area",
      topic: "topic",
      educationalGoal: "goal",
      atomicGoal: "detail",
      term: "detail",
      activity: "detail"
    },
    nodeStyles: {
      area: {
        color: "#9bb7ff",
        border: "#9bb7ff",
        fill: "rgba(155, 183, 255, 0.1)",
        borderStyle: "dashed",
        size: 260,
        shape: "ellipse",
        labelColor: "#0e0f0fff"
      },
      topic: {
        color: "#8fd3c8",
        border: "#8fd3c8",
        fill: "#8fd3c8",
        size: 150,
        shape: "ellipse",
        labelColor: "#181818ff"
      },
      educationalGoal: {
        color: "#ffb347",
        border: "#ffb347",
        fill: "#ffb347",
        size: 110,
        shape: "ellipse",
        labelColor: "#000000ff"
      },
      atomicGoal: {
        color: "#a277ff",
        border: "#a277ff",
        fill: "#a277ff",
        size: 70,
        shape: "ellipse",
        labelColor: "#0e0025ff"
      },
      term: {
        color: "#7ee0ff",
        border: "#7ee0ff",
        fill: "#7ee0ff",
        size: 60,
        shape: "diamond",
        labelColor: "#002028ff"
      },
      activity: {
        color: "#ff7ea9",
        border: "#ff7ea9",
        fill: "#ff7ea9",
        size: 70,
        shape: "roundrectangle",
        borderRadius: 16,
        labelColor: "#120007ff"
      }
    },
    edgeStyles: {
      validates: { color: "#ff7ea9", width: 3, dash: [6, 6] },
      requiresUnderstanding: { color: "#7ee0ff", width: 2, dash: [6, 4] },
      aggregates: { color: "#ffb347", width: 3, dash: [4, 3] },
      isPartOf: { color: "#9bb7ff", width: 2 },
      prerequisite: { color: "#a277ff", width: 2.5, dash: [8, 4] },
      reinforces: { color: "#8fd3c8", width: 2, dash: [5, 3] },
      exemplifies: { color: "#7ee0ff", width: 2, dash: [3, 2] },
      contains: { color: "#ffb347", width: 2.5, dash: [2, 2] },
      validatedBy: { color: "#ff7ea9", width: 3, dash: [6, 6] },
      requires: { color: "#a277ff", width: 2.5, dash: [8, 4] },
      relatesTo: { color: "#8fd3c8", width: 2, dash: [5, 3], directional: false }
    },
    datasets: [
      { label: "Clustered curriculum", value: "clusters.json" },
      { label: "Clustered curriculum 2", value: "clusters2.json" },
      { label: "Simple demo", value: "simpledata.json" },
      { label: "Dataset 1", value: "data1.json" },
      { label: "Dataset 2", value: "data2.json" }
    ],
    defaultDataset: "clusters.json"
  };

  const runtime = { cy: null, clusterOverlays: [], edgeTooltip: null };
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
    const result = initCytoscape(data);
    runtime.cy = result?.cy || null;
    runtime.clusterOverlays = result?.clusterOverlays || [];
    runtime.edgeTooltip = result?.edgeTooltip || null;
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
    if (runtime.edgeTooltip) {
      runtime.edgeTooltip.destroy?.();
      runtime.edgeTooltip = null;
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
    const tooltipHost = (container && container.parentElement) || container;
    const edgeTooltip = createEdgeTooltip(tooltipHost);
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
    const edges = (conceptData.edges || []).map((edge) => {
      const relation = edge.type || edge.relation || "related";
      const styleDefaults = config.edgeStyles[relation] || {};
      const label = edge.label ?? edge.name ?? edge.metadata?.label ?? edge.metadata?.relationshipType ?? "";
      const info =
        edge.info ??
        edge.description ??
        edge.metadata?.description ??
        edge.metadata?.info ??
        edge.metadata?.justification ??
        "";
      const explicitDirectional =
        normalizeDirectionalValue(edge.directional) ??
        normalizeDirectionalValue(edge.directed) ??
        normalizeDirectionalValue(edge.direction) ??
        normalizeDirectionalValue(edge.metadata?.directional) ??
        normalizeDirectionalValue(edge.metadata?.direction);
      const directional = explicitDirectional ?? (styleDefaults.directional ?? true);
      return {
        ...edge,
        relation,
        label,
        info,
        directional
      };
    });
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
      edgeTooltip.hide();
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

    cy.on("mouseover", "edge", (evt) => {
      const data = evt.target.data();
      edgeTooltip.show(
        {
          label: data.label || data.relation,
          type: data.relation,
          info: data.info
        },
        evt.renderedPosition
      );
    });
    cy.on("mousemove", "edge", (evt) => edgeTooltip.move(evt.renderedPosition));
    cy.on("mouseout", "edge", () => edgeTooltip.hide());
    cy.on("tap", "edge", () => edgeTooltip.hide());
    cy.on("pan", () => edgeTooltip.hide());

    cy.on("zoom", () => {
      state.detailLevel = currentDetail(cy.zoom());
      updateZoomReadout();
      applyFilters();
      edgeTooltip.hide();
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
        connections.forEach(({ nodeId, relation, label, info: connectionInfo }) => {
          const other = nodesById.get(nodeId);
          if (!other) return;
          const li = document.createElement("li");
          const descriptor = label || relation;
          li.textContent = `${descriptor}: ${other.label}`;
          if (connectionInfo) {
            li.title = connectionInfo;
          }
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

    return { cy, clusterOverlays: overlayList, edgeTooltip };
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
        { key: "areaCluster", label: "Area clusters" },
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
        map.get(id).push({
          nodeId: id === edge.source ? edge.target : edge.source,
          relation: edge.relation,
          label: edge.label || "",
          info: edge.info || ""
        });
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
    const edgeElements = edges.map((edge) => {
      const classes = [
        `edge-${edge.relation}`,
        edge.directional ? "edge-directional" : "edge-nondirectional"
      ]
        .filter(Boolean)
        .join(" ");
      return {
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          relation: edge.relation,
          label: edge.label || "",
          info: edge.info || "",
          directional: !!edge.directional
        },
        classes
      };
    });
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

  function buildAreaClusters(nodes, areaStyle = {}, clusterDefinitions = []) {
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

  function buildAreaClusterGroups(areaClusters = [], nodes = [], areaStyle = {}) {
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

  function createClusterOverlay(container, clusters = []) {
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
      ctx.strokeStyle = isActive ? strokeBase : strokeBase;
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

  function createEdgeTooltip(host) {
    if (!host) {
      const noop = () => {};
      return { show: noop, move: noop, hide: noop, destroy: noop };
    }
    const tooltip = document.createElement("div");
    tooltip.className = "edge-tooltip is-hidden";
    host.appendChild(tooltip);
    let lastPosition = null;

    function setPosition(position) {
      if (!position) return;
      lastPosition = position;
      tooltip.style.left = `${position.x}px`;
      tooltip.style.top = `${position.y}px`;
    }

    function setContent({ label, type, info }) {
      tooltip.innerHTML = "";
      if (label) {
        const title = document.createElement("div");
        title.className = "edge-tooltip__title";
        title.textContent = label;
        tooltip.appendChild(title);
      }
      const typeRow = document.createElement("div");
      typeRow.className = "edge-tooltip__type";
      typeRow.textContent = `Type: ${type}`;
      tooltip.appendChild(typeRow);
      if (info) {
        const infoRow = document.createElement("div");
        infoRow.className = "edge-tooltip__info";
        infoRow.textContent = info;
        tooltip.appendChild(infoRow);
      }
    }

    return {
      show(payload, position) {
        if (!payload) return;
        setContent(payload);
        setPosition(position || lastPosition || { x: 0, y: 0 });
        tooltip.classList.remove("is-hidden");
      },
      move(position) {
        if (tooltip.classList.contains("is-hidden")) return;
        if (position) {
          setPosition(position);
        } else if (lastPosition) {
          setPosition(lastPosition);
        }
      },
      hide() {
        if (!tooltip.classList.contains("is-hidden")) {
          tooltip.classList.add("is-hidden");
        }
      },
      destroy() {
        tooltip.remove();
      }
    };
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
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "rgba(255,255,255,0.2)",
          "curve-style": "straight",
          "target-arrow-shape": "none",
          "arrow-scale": 0.8
        }
      },
      ...Object.entries(cfg.edgeStyles).map(([rel, val]) => ({
        selector: `.edge-${rel}`,
        style: {
          "line-color": val.color,
          width: val.width,
          "line-style": val.dash ? "dashed" : "solid",
          "line-dash-pattern": val.dash || [],
          "target-arrow-color": val.color
        }
      })),
      { selector: "edge.edge-directional", style: { "target-arrow-shape": "triangle" } },
      { selector: "edge.edge-nondirectional", style: { "target-arrow-shape": "none" } },
      { selector: ".is-hidden", style: { display: "none" } },
      { selector: "node.is-selected", style: { "border-width": 4, "border-color": "#fff" } },
      { selector: "node.is-focused", style: { "border-color": "#fff", "border-width": 3 } },
      { selector: "node.is-linked", style: { "border-color": "#fff" } },
      { selector: "edge.is-linked", style: { "line-color": "#fff", width: 3 } }
    ];
    return styles;
  }

  function applyRadialLayout(nodes, edges, nodesById, clusterDefinitions = []) {
    const centerX = 650;
    const centerY = 420;
    const areas = nodes.filter((n) => n.type === "area");
    if (!areas.length) {
      layoutRing(sortNodesByOrder(nodes), { x: centerX, y: centerY }, 320);
      return;
    }

    const clusterOrder = new Map();
    clusterDefinitions.forEach((cluster, idx) => {
      const key = cluster.areaId || cluster.id;
      if (key) clusterOrder.set(key, idx);
    });

    const areaList = sortNodesByOrder(areas).sort((a, b) => {
      const aRank = clusterOrder.has(a.id) ? clusterOrder.get(a.id) : Number.MAX_SAFE_INTEGER;
      const bRank = clusterOrder.has(b.id) ? clusterOrder.get(b.id) : Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return 0;
    });

    const areaCount = areaList.length;
    const outerRadius = Math.max(320, 180 + areaCount * 90);
    const clusterCenters = new Map();
    areaList.forEach((area, idx) => {
      const angle = areaCount <= 1 ? -Math.PI / 2 : -Math.PI / 2 + (idx * (2 * Math.PI) / areaCount);
      const cx = centerX + outerRadius * Math.cos(angle);
      const cy = centerY + outerRadius * Math.sin(angle);
      area.x = cx;
      area.y = cy;
      area.radius = Math.max(area.radius || 200, 160);
      clusterCenters.set(area.id, { x: cx, y: cy, angle });
    });

    const areaGroups = new Map();
    const strayNodes = [];
    nodes.forEach((node) => {
      const areaId = node.type === "area" ? node.id : node.areaId;
      if (areaId && clusterCenters.has(areaId)) {
        if (!areaGroups.has(areaId)) areaGroups.set(areaId, createAreaGroup());
        addNodeToGroup(areaGroups.get(areaId), node);
      } else if (node.type !== "area") {
        strayNodes.push(node);
      }
    });

    areaGroups.forEach((group, areaId) => {
      const center = clusterCenters.get(areaId) || { x: centerX, y: centerY };
      layoutAreaGroup(group, center);
    });

    if (strayNodes.length) {
      layoutRing(sortNodesByOrder(strayNodes), { x: centerX, y: centerY }, outerRadius + 220);
    }

    function createAreaGroup() {
      return { area: null, topics: [], goals: [], atomic: [], terms: [], activities: [], misc: [] };
    }

    function addNodeToGroup(group, node) {
      switch (node.type) {
        case "area":
          group.area = node;
          break;
        case "topic":
          group.topics.push(node);
          break;
        case "educationalGoal":
          group.goals.push(node);
          break;
        case "atomicGoal":
          group.atomic.push(node);
          break;
        case "term":
          group.terms.push(node);
          break;
        case "activity":
          group.activities.push(node);
          break;
        default:
          group.misc.push(node);
      }
    }

    function layoutAreaGroup(group, center) {
      if (group.area) {
        group.area.x = center.x;
        group.area.y = center.y;
      }
      const topicRadius = 150;
      const goalRadius = topicRadius + 50;
      const atomicRadius = goalRadius + 45;
      const termRadius = atomicRadius + 60;
      const activityRadius = termRadius + 45;
      const miscRadius = activityRadius + 40;

      const topicAngles = layoutRing(group.topics, center, topicRadius);
      placeOrbit(group.goals, { anchorAngles: topicAngles, center, radius: goalRadius, arc: 0.7 });
      placeOrbit(group.atomic, { anchorAngles: topicAngles, center, radius: atomicRadius, arc: 0.9 });
      placeOrbit(group.terms, { anchorAngles: topicAngles, center, radius: termRadius, arc: 1.0 });
      placeOrbit(group.activities, { anchorAngles: topicAngles, center, radius: activityRadius, arc: 1.1 });
      placeOrbit(group.misc, { anchorAngles: topicAngles, center, radius: miscRadius, arc: 1.2 });
    }

    function layoutRing(items, center, radius, angleStore = new Map()) {
      const ordered = sortNodesByOrder(items);
      const count = ordered.length;
      if (!count) return angleStore;
      const step = count === 1 ? 0 : (2 * Math.PI) / count;
      const start = -Math.PI / 2;
      ordered.forEach((node, idx) => {
        const angle = start + idx * step;
        placePolar(node, center, radius, angle);
        angleStore.set(node.id, angle);
      });
      return angleStore;
    }

    function placeOrbit(items, { anchorProp = "topicId", anchorAngles, fallbackAngles, center, radius, arc = 0.6 } = {}) {
      const storedAngles = new Map();
      if (!items?.length) return storedAngles;
      const grouped = new Map();
      items.forEach((item) => {
        const key = getAnchorKey(item, anchorProp);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(item);
      });

      const fallbackGroups = [];
      grouped.forEach((nodesForKey, key) => {
        const anchorAngle = key && (anchorAngles?.get(key) ?? fallbackAngles?.get(key));
        if (anchorAngle != null) {
          distribute(nodesForKey, anchorAngle);
        } else {
          fallbackGroups.push(nodesForKey);
        }
      });

      if (fallbackGroups.length) {
        const fallbackStep = (2 * Math.PI) / fallbackGroups.length;
        fallbackGroups.forEach((nodesForGroup, idx) => {
          const baseAngle = -Math.PI / 2 + idx * fallbackStep;
          distribute(nodesForGroup, baseAngle);
        });
      }

      return storedAngles;

      function distribute(nodesForGroup, baseAngle) {
        const ordered = sortNodesByOrder(nodesForGroup);
        if (!ordered.length) return;
        if (ordered.length === 1) {
          placePolar(ordered[0], center, radius, baseAngle);
          storedAngles.set(ordered[0].id, baseAngle);
          return;
        }
        const span = Math.min(arc, Math.PI / 1.1);
        const step = span / (ordered.length - 1);
        let current = baseAngle - span / 2;
        ordered.forEach((node) => {
          placePolar(node, center, radius, current);
          storedAngles.set(node.id, current);
          current += step;
        });
      }
    }

    function getAnchorKey(node, prop) {
      if (!node) return null;
      return (
        node[prop] ??
        node.topicId ??
        node.parentTopicId ??
        node.metadata?.topicId ??
        node.areaId ??
        null
      );
    }

    function placePolar(node, center, radius, angle) {
      if (!node || !center) return;
      const r = Math.max(radius, 24);
      node.x = center.x + r * Math.cos(angle);
      node.y = center.y + r * Math.sin(angle);
    }
  }

  function sortNodesByOrder(items = []) {
    return (Array.isArray(items) ? items : [])
      .slice()
      .sort((a, b) => {
        const aOrder = nodeOrderValue(a);
        const bOrder = nodeOrderValue(b);
        if (aOrder !== bOrder) return aOrder - bOrder;
        const aLabel = (a?.label || a?.id || "").toString();
        const bLabel = (b?.label || b?.id || "").toString();
        return aLabel.localeCompare(bLabel);
      });
  }

  function nodeOrderValue(node) {
    if (!node) return 0;
    if (Number.isFinite(node.order)) return node.order;
    if (Number.isFinite(node.sequence)) return node.sequence;
    if (Number.isFinite(node.metadata?.order)) return node.metadata.order;
    return 0;
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
    const breaks = config.zoomBreaks || {};
    const entries = Object.entries(breaks).sort((a, b) => a[1] - b[1]);
    for (const [name, val] of entries) {
      if (zoom <= val) return name;
    }
    // if above all breakpoints, return the last (closest/highest-detail) key
    return entries.length ? entries[entries.length - 1][0] : "close";
  }

  function detailRank(level) {
    const breaks = config.zoomBreaks || {};
    const keys = Object.keys(breaks).sort((a, b) => (breaks[a] || 0) - (breaks[b] || 0));
    const idx = keys.indexOf(level);
    if (idx >= 0) return idx;
    return keys.length ? keys.length - 1 : 2;
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

  function normalizeDirectionalValue(value) {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["undirected", "nondirectional", "none", "bidirectional"].includes(normalized)) {
        return false;
      }
      if (["directed", "directional", "arrow", "witharrow"].includes(normalized)) {
        return true;
      }
    }
    return undefined;
  }

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }
})();
