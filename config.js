// Centralized visualization configuration: colors, dataset list, and zoom thresholds.
export const config = {
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
    areaCluster: {
      color: "#9bb7ff",
      border: "#9bb7ff",
      fill: "rgba(155, 183, 255, 0)",
      borderStyle: "dashed",
      size: 260,
      shape: "ellipse",
      labelColor: "#0e0f0fff"
    },
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
    relatesTo: { color: "#8fd3c8", width: 2, dash: [5, 3] }
  },
  datasets: [
    { label: "Clustered curriculum", value: "clusters.json" },
    { label: "Clustered curriculum 2", value: "clusters2.json" },
    { label: "Simple demo", value: "simpledata.json" },
    { label: "Dataset 1", value: "data1.json" },
    { label: "Dataset 2", value: "data2.json" },
    { label: "RVP", value: "compiled_schema.json" }
  ],
  defaultDataset: "clusters.json"
};
