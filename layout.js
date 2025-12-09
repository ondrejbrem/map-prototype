// Node positioning algorithms (clusters, orbits, fallback rings).
export function applyRadialLayout(nodes, edges, nodesById, clusterDefinitions = []) {
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

  function placeOrbit(
    items,
    { anchorProp = "topicId", anchorAngles, fallbackAngles, center, radius, arc = 0.6 } = {}
  ) {
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
