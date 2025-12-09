// Filter chip creation + expertise parsing for the control sidebar.
import { extractLevels } from "./utils.js";

export function initFilters(nodes, filters, typeFilterEl, expertiseFilterEl, expertiseOrder, onChange) {
  const levelOptions = Array.from(
    new Set(nodes.flatMap((node) => extractLevels(node.expertise, expertiseOrder)))
  ).sort((a, b) => expertiseOrder.indexOf(a) - expertiseOrder.indexOf(b));
  if (levelOptions.length === 0) levelOptions.push("A1");
  levelOptions.forEach((level) => filters.expertise.add(level));

  if (typeFilterEl) {
    createChips(
      typeFilterEl,
      [
        { key: "areaCluster", label: "Area clusters" },
        { key: "area", label: "Areas" },
        { key: "topic", label: "Topics" },
        { key: "educationalGoal", label: "Educational goals" },
        { key: "atomicGoal", label: "Atomic goals" },
        { key: "activity", label: "Activities" },
        { key: "term", label: "Terms" }
      ],
      filters.types,
      onChange
    );
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
