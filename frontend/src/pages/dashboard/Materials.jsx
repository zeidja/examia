import { useState, useEffect } from 'react';
import { showError } from '../../utils/swal';
import { motion } from 'framer-motion';
import api from '../../api/axios';

function TreeNode({ node, level = 0, expanded, onToggle, onOpenFile }) {
  const isFolder = node.type === 'folder';
  const isFile = node.type === 'file';
  const hasChildren = isFolder && node.children?.length > 0;
  const isExpanded = expanded[node.relativePath ?? node.path ?? node.name];

  return (
    <li className="list-none">
      {isFolder && (
        <>
          <button
            type="button"
            onClick={() => onToggle(node.relativePath ?? node.path ?? node.name)}
            className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-examia-soft/20 font-medium text-examia-dark"
            style={{ paddingLeft: `${12 + level * 12}px` }}
          >
            <span className="text-examia-mid w-4">
              {hasChildren ? (isExpanded ? '▼' : '▶') : '📁'}
            </span>
            📁 {node.name}
            {hasChildren && <span className="text-examia-mid text-sm">({node.children.length})</span>}
          </button>
          {hasChildren && isExpanded && (
            <ul className="border-l border-examia-soft/50 ml-2">
              {node.children.map((child) => (
                <TreeNode
                  key={child.relativePath ?? child.path ?? child.name}
                  node={child}
                  level={level + 1}
                  expanded={expanded}
                  onToggle={onToggle}
                  onOpenFile={onOpenFile}
                />
              ))}
            </ul>
          )}
        </>
      )}
      {isFile && (
        <button
          type="button"
          onClick={() => onOpenFile(node.relativePath || node.path, node.name)}
          style={{ paddingLeft: `${12 + level * 12}px` }}
          className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-examia-soft/20 group text-examia-dark"
        >
          <span className="text-examia-mid">📄</span>
          <span className="text-sm flex-1 truncate">{node.name}</span>
          <span className="text-sm text-examia-mid font-medium opacity-0 group-hover:opacity-100 transition">Open</span>
        </button>
      )}
    </li>
  );
}

export function Materials() {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [openingPath, setOpeningPath] = useState(null);

  useEffect(() => {
    api.get('/materials/tree').then((r) => setTree(r.data.tree)).catch(() => setTree(null)).finally(() => setLoading(false));
  }, []);

  const toggle = (key) => {
    setExpanded((e) => ({ ...e, [key]: !e[key] }));
  };

  const openFile = async (relativePath, fileName) => {
    if (!relativePath) return;
    setOpeningPath(relativePath);
    try {
      const { data } = await api.get('/materials/file', {
        params: { path: relativePath },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      await showError(err.response?.data?.message || 'Could not open file');
    } finally {
      setOpeningPath(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-examia-mid border-t-transparent" />
        <p className="text-sm text-examia-mid font-medium">Loading materials…</p>
      </div>
    );
  }

  const children = tree?.children || [];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-examia-dark">Materials</h1>
        <p className="text-examia-mid mt-1 text-sm">Platform materials folder. Used as context for AI generation. Open files to preview.</p>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-examia-soft/20">
        <ul className="space-y-0">
          {children.map((subject) => (
            <TreeNode
              key={subject.relativePath ?? subject.name}
              node={subject}
              expanded={expanded}
              onToggle={toggle}
              onOpenFile={openFile}
            />
          ))}
        </ul>
        {children.length === 0 && !tree?.error && (
          <div className="py-12 text-center">
            <p className="font-semibold text-examia-dark">No materials found</p>
            <p className="text-examia-mid text-sm mt-1">Add folders and files to the materials directory on the server.</p>
          </div>
        )}
        {tree?.error && <p className="text-red-600 text-sm py-4">Error loading tree: {tree.error}</p>}
      </div>
      {openingPath && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-lg bg-examia-dark text-white text-sm shadow">
          Opening…
        </div>
      )}
    </motion.div>
  );
}
