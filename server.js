const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Helper: check valid edge
function isValidEdge(str) {
  if (typeof str !== "string") return false;
  str = str.trim();

  if (!str.includes("->")) return false;

  const parts = str.split("->");
  if (parts.length !== 2) return false;

  const [parent, child] = parts;

  if (!/^[A-Z]$/.test(parent)) return false;
  if (!/^[A-Z]$/.test(child)) return false;
  if (parent === child) return false;

  return true;
}

app.post("/bfhl", (req, res) => {
  const data = req.body.data || [];

  const invalid_entries = [];
  const duplicate_edges = [];
  const seen = new Set();
  const edges = [];

  // Step 1: validate + duplicates
  data.forEach((item) => {
    if (!isValidEdge(item)) {
      invalid_entries.push(item);
    } else {
      const trimmed = item.trim();
      if (seen.has(trimmed)) {
        if (!duplicate_edges.includes(trimmed)) {
          duplicate_edges.push(trimmed);
        }
      } else {
        seen.add(trimmed);
        edges.push(trimmed);
      }
    }
  });

  // Step 2: build graph
  const graph = {};
  const childSet = new Set();

  edges.forEach((edge) => {
    const [p, c] = edge.split("->");

    if (!graph[p]) graph[p] = [];
    graph[p].push(c);

    childSet.add(c);
  });

  // Step 3: find roots
  const allNodes = new Set();
  edges.forEach((e) => {
    const [p, c] = e.split("->");
    allNodes.add(p);
    allNodes.add(c);
  });

  let roots = [...allNodes].filter((n) => !childSet.has(n));

  if (roots.length === 0 && allNodes.size > 0) {
    roots = [Array.from(allNodes).sort()[0]];
  }

  const visited = new Set();
  const hierarchies = [];
  let total_cycles = 0;

  function dfs(node, pathSet) {
    if (pathSet.has(node)) return "cycle";

    pathSet.add(node);
    visited.add(node);

    const children = graph[node] || [];
    const obj = {};

    let maxDepth = 1;

    for (let child of children) {
      const res = dfs(child, new Set(pathSet));

      if (res === "cycle") return "cycle";

      obj[child] = res.tree;
      maxDepth = Math.max(maxDepth, 1 + res.depth);
    }

    return { tree: obj, depth: maxDepth };
  }

  roots.forEach((root) => {
    if (visited.has(root)) return;

    const result = dfs(root, new Set());

    if (result === "cycle") {
      total_cycles++;
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true,
      });
    } else {
      hierarchies.push({
        root,
        tree: { [root]: result.tree },
        depth: result.depth,
      });
    }
  });

  // summary
  const validTrees = hierarchies.filter((h) => !h.has_cycle);
  let largest_tree_root = "";

  if (validTrees.length > 0) {
    validTrees.sort((a, b) => {
      if (b.depth === a.depth) return a.root.localeCompare(b.root);
      return b.depth - a.depth;
    });

    largest_tree_root = validTrees[0].root;
  }

  res.json({
    user_id: "Jeshnav velagapudi_12072006",
    email_id: "jeshnav_velagapudi@srmap.edu.in",
    college_roll_number: "AP23110010074",
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees: validTrees.length,
      total_cycles,
      largest_tree_root,
    },
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));