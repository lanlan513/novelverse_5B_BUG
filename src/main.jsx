import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AlertTriangle, BookOpen, ChevronRight, Cloud, CloudOff, Compass, Eye, FilePenLine, Flag, FolderOpen, Footprints, GitBranch, History, ImagePlus, Keyboard, KeyRound, Library, LockKeyhole, Menu, MoreHorizontal, PenLine, Play, Plus, RefreshCw, Rocket, RotateCcw, Save, Search, Send, Share2, Sparkles, Trash2, Undo2, Users, WifiOff, X } from 'lucide-react'
import './styles.css'

const API = '/api'
const userId = 'user-demo'
const api = async (path, options = {}) => { const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', 'x-user-id': userId, ...(options.headers || {}) } }); const payload = await response.json().catch(() => ({})); if (!response.ok) { const error = new Error(payload.message || '请求失败'); Object.assign(error, payload, { status: response.status }); throw error } return payload }
const formatDate = value => new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))

function App() {
  const [user, setUser] = useState(null); const [projects, setProjects] = useState([]); const [activeId, setActiveId] = useState(null); const [loading, setLoading] = useState(true); const [view, setView] = useState('workspace'); const [notice, setNotice] = useState(null); const [mobileNav, setMobileNav] = useState(false); const [showCreate, setShowCreate] = useState(false)
  const active = projects.find(p => p.id === activeId) || projects[0] || null
  const refresh = useCallback(async () => { setLoading(true); try { const [{ user }, { projects }] = await Promise.all([api('/me'), api('/projects')]); setUser(user); setProjects(projects); setActiveId(current => projects.some(p => p.id === current) ? current : projects[0]?.id || null) } catch (error) { setNotice({ type: 'error', text: error.message }) } finally { setLoading(false) } }, [])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(null), 5200); return () => clearTimeout(timer) }, [notice])
  const selectProject = id => { setActiveId(id); setView('workspace'); setMobileNav(false) }
  const handleCreated = project => { setProjects(list => [project, ...list]); setActiveId(project.id); setShowCreate(false); setView('workspace'); setNotice({ type: 'success', text: '项目已创建，工作台准备好了' }) }
  const updateProject = updated => setProjects(list => list.map(p => p.id === updated.id ? updated : p))
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Sparkles size={16} /></span><span>Novelverse</span><button className="icon-btn close-mobile" onClick={() => setMobileNav(false)} aria-label="关闭导航"><X size={18} /></button></div>
      <div className="sidebar-user"><div className="avatar">{user?.initials || 'LZ'}</div><div><strong>{user?.name || '正在加载'}</strong><span>创作者空间</span></div><MoreHorizontal size={18} className="muted-icon" /></div>
      <nav className="primary-nav"><button className={view === 'workspace' ? 'active' : ''} onClick={() => { setView('workspace'); setMobileNav(false) }}><PenLine size={17} />工作台</button><button className={view === 'projects' ? 'active' : ''} onClick={() => { setView('projects'); setMobileNav(false) }}><FolderOpen size={17} />我的项目 <span className="nav-count">{projects.length}</span></button><button onClick={() => setNotice({ type: 'info', text: '赏析空间正在整理中，稍后开放' })}><Library size={17} />赏析</button><button onClick={() => setNotice({ type: 'info', text: '历史记录将在下一阶段接入' })}><History size={17} />历史</button><button onClick={() => setNotice({ type: 'info', text: '共读功能正在准备中' })}><Users size={17} />共读</button></nav>
      <div className="sidebar-bottom"><div className="up-next"><span className="eyebrow">NEXT CHAPTER</span><strong>把灵感变成章节</strong><p>从一个项目开始，慢慢长出你的故事宇宙。</p><button onClick={() => setShowCreate(true)}>新建项目 <Plus size={15} /></button></div><div className="sidebar-footer"><span>v0.1 · 预览版</span><button aria-label="帮助" onClick={() => setNotice({ type: 'info', text: '快捷键：⌘/Ctrl + S 保存草稿' })}><Keyboard size={16} /></button></div></div>
    </aside>
    {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)} />}
    <main className="main-content">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={() => setMobileNav(true)} aria-label="打开导航"><Menu size={20} /></button><div className="breadcrumbs"><span>你的空间</span><span>/</span><strong>{view === 'projects' ? '我的项目' : active?.title || '工作台'}</strong></div><div className="top-actions"><div className="sync-dot"><span className="dot"></span>已同步</div><button className="icon-btn" aria-label="搜索" onClick={() => setNotice({ type: 'info', text: '搜索会在项目超过 3 个后自动启用' })}><Search size={18} /></button><button className="create-btn" onClick={() => setShowCreate(true)}><Plus size={17} />新建项目</button></div></header>
      {notice && <div className={`notice ${notice.type}`} role="status"><span>{notice.type === 'error' ? <CloudOff size={16} /> : notice.type === 'success' ? <Cloud size={16} /> : <Sparkles size={16} />}</span>{notice.text}<button onClick={() => setNotice(null)} aria-label="关闭提示"><X size={15} /></button></div>}
      {loading ? <LoadingState /> : view === 'projects' ? <ProjectsView projects={projects} activeId={activeId} onSelect={selectProject} onCreate={() => setShowCreate(true)} /> : <Workspace project={active} onUpdate={updateProject} onNotice={setNotice} />}
    </main>
    {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={handleCreated} onError={error => setNotice({ type: 'error', text: error.message })} />}
  </div>
}

function LoadingState() { return <div className="loading-state"><div className="spinner"></div><span>正在唤醒你的故事宇宙…</span></div> }

function ProjectsView({ projects, activeId, onSelect, onCreate }) { return <section className="page-section projects-page"><div className="page-heading"><div><span className="eyebrow">PROJECTS / 01</span><h1>我的项目</h1><p>所有故事，都从一个被命名的世界开始。</p></div><button className="primary-btn" onClick={onCreate}><Plus size={17} />创建项目</button></div>{projects.length === 0 ? <EmptyState onCreate={onCreate} /> : <div className="project-grid">{projects.map(project => <ProjectCard key={project.id} project={project} active={project.id === activeId} onClick={() => onSelect(project.id)} />)}</div>}</section> }
function ProjectCard({ project, active, onClick }) { return <button className={`project-card ${active ? 'selected' : ''}`} onClick={onClick}><div className="card-cover">{project.cover?.value ? <img src={project.cover.value} alt="" onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.classList.add('cover-fallback') }} /> : <div className="cover-fallback"><BookOpen size={28} /></div>}<span className="visibility-pill">{project.visibility === 'shared' ? <><Share2 size={12} />共享</> : <><LockKeyhole size={12} />私密</>}</span></div><div className="card-content"><div><h3>{project.title}</h3><p>{project.description || '还没有简介，给这个故事留下一句注脚。'}</p></div><div className="card-meta"><span>{project.draft?.content ? `${project.draft.content.length} 字草稿` : '空白草稿'}</span><span>{formatDate(project.updatedAt)}</span></div></div></button> }
function EmptyState({ onCreate }) { return <div className="empty-state"><div className="empty-icon"><Compass size={25} /></div><h2>还没有故事</h2><p>先给你的第一个世界一个名字，工作台会替你记住每次灵感。</p><button className="primary-btn" onClick={onCreate}><Plus size={17} />创建第一个项目</button></div> }

function Workspace({ project, onUpdate, onNotice }) { const [draft, setDraft] = useState(null); const [draftLoading, setDraftLoading] = useState(Boolean(project)); const [saveState, setSaveState] = useState('saved'); const [conflict, setConflict] = useState(null); const [showMeta, setShowMeta] = useState(false); const [tab, setTab] = useState('draft'); const saveTimer = useRef(null); const latestDraft = useRef(null); const localKey = project ? `novelverse-draft-${project.id}` : null
  useEffect(() => { let cancelled = false; if (!project) { setDraft(null); setDraftLoading(false); return } setDraftLoading(true); api(`/projects/${project.id}/draft`).then(({ draft }) => { if (cancelled) return; const local = localKey ? localStorage.getItem(localKey) : null; const localDraft = local ? JSON.parse(local) : null; const localIsNewer = localDraft && (localDraft.version > draft.version || (localDraft.version === draft.version && localDraft.content !== draft.content)); const chosen = localIsNewer ? localDraft : draft; setDraft(chosen); latestDraft.current = chosen; setDraftLoading(false); if (localIsNewer) setSaveState('pending') }).catch(error => { if (!cancelled) { setDraft(project.draft); setDraftLoading(false); onNotice({ type: 'error', text: error.message }) } }); return () => { cancelled = true } }, [project?.id])
  const persist = useCallback(async (value, immediate = false) => { if (!project || !value) return; clearTimeout(saveTimer.current); const run = async () => { setSaveState('saving'); try { const result = await api(`/projects/${project.id}/draft`, { method: 'PUT', body: JSON.stringify({ content: value.content, baseVersion: value.version }) }); const next = result.draft; setDraft(next); latestDraft.current = next; localStorage.removeItem(localKey); setSaveState('saved'); onUpdate({ ...project, draft: next, updatedAt: next.updatedAt }) } catch (error) { if (error.error === 'DRAFT_CONFLICT') { setConflict(error); setSaveState('conflict') } else { localStorage.setItem(localKey, JSON.stringify(value)); setSaveState('failed') } } }; immediate ? run() : (saveTimer.current = setTimeout(run, 900)) }, [project, localKey, onUpdate])
  useEffect(() => { const onKey = event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (latestDraft.current) persist(latestDraft.current, true) } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [persist])
  useEffect(() => () => { clearTimeout(saveTimer.current); const value = latestDraft.current; if (value && project && navigator.sendBeacon) { const blob = new Blob([JSON.stringify({ content: value.content, baseVersion: value.version })], { type: 'application/json' }); navigator.sendBeacon(`${API}/projects/${project.id}/draft?userId=${encodeURIComponent(userId)}`, blob) } }, [project?.id])
  const onChange = event => { const next = { ...(draft || { version: project?.draft?.version || 0 }), content: event.target.value }; setDraft(next); latestDraft.current = next; setSaveState('pending'); localStorage.setItem(localKey, JSON.stringify(next)); persist(next) }
  const chooseConflict = choice => { if (choice === 'local') { setConflict(null); persist(draft, true) } else { const server = conflict.serverDraft; setDraft(server); latestDraft.current = server; localStorage.removeItem(localKey); setConflict(null); setSaveState('saved') } }
  if (!project) return <section className="page-section workspace-empty"><EmptyState /></section>
  return <section className="workspace"><div className="workspace-head"><div><span className="eyebrow">WORKSPACE / {project.visibility === 'shared' ? 'SHARED' : 'PRIVATE'}</span><h1>{project.title}</h1><p>{project.description || '给这个故事留下一句注脚。'}</p></div><div className="workspace-actions"><button className="secondary-btn" onClick={() => setShowMeta(value => !value)}><FilePenLine size={16} />编辑项目</button><button className="secondary-btn" onClick={() => onNotice({ type: 'info', text: project.visibility === 'shared' ? '已是共享项目，邀请入口即将开放' : '项目保持私密，只有你能看到' })}><Share2 size={16} />{project.visibility === 'shared' ? '共享中' : '共享'}</button></div></div>{showMeta && <ProjectMeta project={project} onUpdate={onUpdate} onClose={() => setShowMeta(false)} onNotice={onNotice} />}
    <div className="workspace-tabs"><button className={tab === 'draft' ? 'active' : ''} onClick={() => setTab('draft')}><PenLine size={15} />正文草稿</button><button className={tab === 'branch' ? 'active' : ''} onClick={() => setTab('branch')}><GitBranch size={15} />分支叙事</button></div>
    {tab === 'branch' ? <BranchStudio project={project} onNotice={onNotice} /> : <>
    <div className="workspace-grid"><div className="editor-panel"><div className="editor-toolbar"><div className="editor-label"><span className="live-dot"></span>草稿 · 第一章</div><div className={`save-indicator ${saveState}`}><Save size={14} />{saveState === 'saving' ? '保存中…' : saveState === 'pending' ? '待保存' : saveState === 'failed' ? '保存失败，已暂存本地' : saveState === 'conflict' ? '存在版本冲突' : '已自动保存'}<button className="icon-btn tiny" onClick={() => draft && persist(draft, true)} aria-label="立即保存"><RefreshCw size={13} /></button></div></div>{draftLoading ? <div className="editor-loading"><div className="spinner small"></div>正在恢复最近编辑…</div> : <textarea className="draft-editor" value={draft?.content || ''} onChange={onChange} placeholder="从一句话开始，写下这个世界的第一束光…" aria-label="小说草稿编辑器" />}</div><aside className="insight-rail"><div className="rail-block"><span className="eyebrow">PROJECT NOTE</span><h3>让故事先呼吸</h3><p>不用急着写完。每一次自动保存，都是给未来的自己留一盏灯。</p><div className="rail-line"></div><div className="stat-row"><span>字数</span><strong>{draft?.content?.length || 0}</strong></div><div className="stat-row"><span>版本</span><strong>v{(draft?.version || 0) + 1}</strong></div></div><div className="rail-block muted-block"><div className="rail-icon"><Cloud size={17} /></div><div><strong>跨设备同步</strong><p>草稿会在你的设备间保持最新。</p></div></div></aside></div>{conflict && <ConflictBanner conflict={conflict} onChoose={chooseConflict} />}</>}</section> }

function ProjectMeta({ project, onUpdate, onClose, onNotice }) { const [title, setTitle] = useState(project.title); const [description, setDescription] = useState(project.description); const [visibility, setVisibility] = useState(project.visibility); const submit = async event => { event.preventDefault(); try { const { project: updated } = await api(`/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify({ title, description, visibility }) }); onUpdate(updated); onClose(); onNotice({ type: 'success', text: '项目资料已更新' }) } catch (error) { onNotice({ type: 'error', text: error.message }) } }; return <form className="meta-panel" onSubmit={submit}><div className="meta-fields"><label>项目标题<input value={title} onChange={e => setTitle(e.target.value)} required /></label><label>简介<input value={description} onChange={e => setDescription(e.target.value)} placeholder="一句话介绍你的故事" /></label><label>可见范围<select value={visibility} onChange={e => setVisibility(e.target.value)}><option value="private">私密 · 只有我</option><option value="shared">共享 · 邀请后可见</option></select></label></div><div className="meta-actions"><button type="button" className="text-btn" onClick={onClose}>取消</button><button type="submit" className="primary-btn">保存资料</button></div></form> }
function ConflictBanner({ conflict, onChoose }) { return <div className="conflict-banner"><div><strong>发现另一台设备的更新</strong><p>你可以保留当前草稿，或恢复服务器上最新的版本。</p></div><div className="conflict-actions"><button className="secondary-btn" onClick={() => onChoose('server')}>使用最新版本</button><button className="primary-btn" onClick={() => onChoose('local')}>保留我的版本</button></div></div> }

// ---------- 分支叙事：本地校验（与服务端规则保持一致，用于即时反馈） ----------
function validateGraphLocal(graph) {
  const errors = []; const warnings = []
  const nodes = graph?.nodes || []
  if (!nodes.length) { errors.push({ code: 'EMPTY_GRAPH', message: '还没有任何段落节点' }); return { errors, warnings } }
  const index = new Map(nodes.map(n => [n.id, n]))
  const start = graph.startNodeId ? index.get(graph.startNodeId) : null
  if (!start) errors.push({ code: 'NO_START', message: '还没有设置起始段落' })
  for (const node of nodes) {
    if (node.kind === 'ending') continue
    if (!node.choices || node.choices.length === 0) { errors.push({ code: 'DEAD_END', nodeId: node.id, message: `「${node.title || '未命名'}」不是结局，但没有任何出口选项` }); continue }
    for (const c of node.choices) {
      if (!String(c.label || '').trim()) errors.push({ code: 'EMPTY_LABEL', nodeId: node.id, message: `「${node.title || '未命名'}」有没有填写文字的选项` })
      if (!index.has(c.targetId)) errors.push({ code: 'DANGLING_CHOICE', nodeId: node.id, message: `「${node.title || '未命名'}」的选项「${c.label || '未命名'}」没有有效的去向` })
    }
  }
  if (start) {
    const seen = new Set(); const queue = [graph.startNodeId]
    while (queue.length) { const id = queue.shift(); if (!id || seen.has(id)) continue; seen.add(id); const n = index.get(id); if (!n) continue; for (const c of n.choices || []) queue.push(c.targetId) }
    for (const n of nodes) if (!seen.has(n.id)) warnings.push({ code: 'UNREACHABLE', nodeId: n.id, message: `「${n.title || '未命名'}」从起点无法到达（断开的节点）` })
    if (![...seen].some(id => index.get(id)?.kind === 'ending')) errors.push({ code: 'NO_ENDING', message: '从起点出发无法到达任何结局' })
    const state = new Map()
    const visit = id => { if (state.get(id) === 0) return true; if (state.has(id)) return false; state.set(id, 0); const n = index.get(id); for (const c of n?.choices || []) if (index.has(c.targetId) && visit(c.targetId)) return true; state.set(id, 1); return false }
    if (visit(graph.startNodeId)) warnings.push({ code: 'HAS_LOOP', message: '故事存在循环路径，试玩将有步数上限保护' })
  }
  return { errors, warnings }
}

// ---------- 分支工作室 ----------
function BranchStudio({ project, onNotice }) {
  const [data, setData] = useState(null)
  const [graph, setGraph] = useState(null)
  const [saveState, setSaveState] = useState('saved')
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [play, setPlay] = useState(null)
  const saveTimer = useRef(null); const latestGraph = useRef(null); const baseVersion = useRef(0)

  const load = useCallback(async () => { setLoading(true); try { const payload = await api(`/projects/${project.id}/branch`); setData(payload); setGraph(payload.draft); latestGraph.current = payload.draft; baseVersion.current = payload.draft.version; setSaveState('saved') } catch (error) { onNotice({ type: 'error', text: error.message }) } finally { setLoading(false) } }, [project.id])
  useEffect(() => { load() }, [load])
  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const validation = useMemo(() => graph ? validateGraphLocal(graph) : { errors: [], warnings: [] }, [graph])

  const persist = useCallback((next, immediate = false) => {
    clearTimeout(saveTimer.current)
    const run = async () => {
      setSaveState('saving')
      try { const payload = await api(`/projects/${project.id}/branch`, { method: 'PUT', body: JSON.stringify({ graph: next, baseVersion: baseVersion.current }) }); baseVersion.current = payload.draft.version; setData(d => d ? { ...d, draft: payload.draft, versions: payload.versions } : payload); setSaveState('saved') }
      catch (error) { if (error.error === 'BRANCH_CONFLICT') setSaveState('conflict'); else setSaveState('failed') }
    }
    immediate ? run() : (saveTimer.current = setTimeout(run, 800))
  }, [project.id])

  const update = mutator => { const next = mutator(structuredClone(graph)); setGraph(next); latestGraph.current = next; setSaveState('pending'); persist(next) }
  const updateNode = (id, patch) => update(g => { const n = g.nodes.find(n => n.id === id); if (n) Object.assign(n, patch); return g })
  const addNode = kind => update(g => { const id = `node-${crypto.randomUUID()}`; g.nodes.push({ id, kind, title: kind === 'ending' ? '新结局' : '新段落', text: '', choices: [] }); if (!g.startNodeId) g.startNodeId = id; return g })
  const deleteNode = id => { if (!window.confirm('删除这个节点后，指向它的选项也会一并移除。确定删除？')) return; update(g => { g.nodes = g.nodes.filter(n => n.id !== id); for (const n of g.nodes) n.choices = (n.choices || []).filter(c => c.targetId !== id); if (g.startNodeId === id) g.startNodeId = g.nodes[0]?.id || null; return g }) }
  const setStart = id => update(g => { g.startNodeId = id; return g })
  const setKind = (id, kind) => { const node = graph.nodes.find(n => n.id === id); if (kind === 'ending' && node?.choices?.length && !window.confirm('改为结局后，这个节点的选项会被清空。继续？')) return; update(g => { const n = g.nodes.find(n => n.id === id); if (n) { n.kind = kind; if (kind === 'ending') n.choices = [] } return g }) }
  const addChoice = nodeId => update(g => { const n = g.nodes.find(n => n.id === nodeId); if (n) n.choices.push({ id: `choice-${crypto.randomUUID()}`, label: '', targetId: '' }); return g })
  const updateChoice = (nodeId, choiceId, patch) => update(g => { const c = g.nodes.find(n => n.id === nodeId)?.choices.find(c => c.id === choiceId); if (c) Object.assign(c, patch); return g })
  const deleteChoice = (nodeId, choiceId) => update(g => { const n = g.nodes.find(n => n.id === nodeId); if (n) n.choices = n.choices.filter(c => c.id !== choiceId); return g })

  const flushSave = async () => { clearTimeout(saveTimer.current); const payload = await api(`/projects/${project.id}/branch`, { method: 'PUT', body: JSON.stringify({ graph: latestGraph.current, baseVersion: baseVersion.current }) }); baseVersion.current = payload.draft.version; setData(d => d ? { ...d, draft: payload.draft, versions: payload.versions } : payload); setSaveState('saved'); return payload.draft.version }

  const publish = async () => {
    if (publishing) return
    setPublishing(true)
    try {
      const version = await flushSave()
      const payload = await api(`/projects/${project.id}/branch/publish`, { method: 'POST', body: JSON.stringify({ baseVersion: version }) })
      setData(d => d ? { ...d, versions: payload.versions } : d)
      onNotice({ type: 'success', text: `v${payload.version.version} 已发布，读者现在可以看到这个版本` })
    } catch (error) {
      if (error.error === 'VALIDATION_FAILED') onNotice({ type: 'error', text: '还有未解决的问题，无法发布' })
      else if (error.error === 'PUBLISH_CONFLICT' || error.error === 'BRANCH_CONFLICT') { onNotice({ type: 'error', text: '草稿在发布过程中被修改，已为你载入最新内容' }); await load() }
      else onNotice({ type: 'error', text: error.message })
    } finally { setPublishing(false) }
  }

  const retract = async version => {
    if (!window.confirm(`撤回 v${version.version} 后，读者将暂时看不到可试玩的版本。确定撤回？`)) return
    try { const payload = await api(`/projects/${project.id}/branch/versions/${version.id}/retract`, { method: 'POST', body: '{}' }); setData(d => d ? { ...d, versions: payload.versions } : d); onNotice({ type: 'info', text: `v${version.version} 已撤回，进行中的试玩不受影响` }) }
    catch (error) { onNotice({ type: 'error', text: error.message }) }
  }

  const forceOverwrite = async () => { try { const fresh = await api(`/projects/${project.id}/branch`); baseVersion.current = fresh.draft.version; persist(latestGraph.current, true) } catch (error) { onNotice({ type: 'error', text: error.message }) } }

  if (loading || !graph || !data) return <div className="editor-loading"><div className="spinner small"></div>正在铺开故事的分岔小径…</div>
  const liveVersion = data.versions.find(v => v.status === 'live')
  return <div className="branch-studio">
    <div className="branch-toolbar">
      <div className={`save-indicator ${saveState}`}><Save size={14} />{saveState === 'saving' ? '保存中…' : saveState === 'pending' ? '待保存' : saveState === 'failed' ? '保存失败' : saveState === 'conflict' ? '存在版本冲突' : '草稿已保存'}</div>
      <div className="branch-toolbar-actions">
        <button className="secondary-btn" onClick={() => setPlay({ mode: 'preview' })}><Play size={15} />预览草稿</button>
        <button className="secondary-btn" disabled={!liveVersion} title={liveVersion ? '' : '还没有已发布的版本'} onClick={() => setPlay({ mode: 'published' })}><Eye size={15} />读者视角{liveVersion ? ` · v${liveVersion.version}` : ''}</button>
        <button className="primary-btn" disabled={publishing || validation.errors.length > 0} onClick={publish}><Rocket size={15} />{publishing ? '发布中…' : '发布新版本'}</button>
      </div>
    </div>
    {saveState === 'conflict' && <div className="branch-banner error"><AlertTriangle size={15} /><span>分支草稿在另一处被修改过。</span><button className="secondary-btn" onClick={load}>载入最新</button><button className="primary-btn" onClick={forceOverwrite}>用我的修改覆盖</button></div>}
    {saveState === 'failed' && <div className="branch-banner error"><WifiOff size={15} /><span>保存失败，可能是网络中断。</span><button className="secondary-btn" onClick={() => persist(latestGraph.current, true)}>重试保存</button></div>}
    <div className="branch-grid">
      <div className="node-list">
        {validation.errors.length + validation.warnings.length > 0 && <div className="validation-panel">
          {validation.errors.map((issue, i) => <p key={`e${i}`} className="node-issue error"><AlertTriangle size={13} />{issue.message}</p>)}
          {validation.warnings.map((issue, i) => <p key={`w${i}`} className="node-issue warning"><AlertTriangle size={13} />{issue.message}</p>)}
        </div>}
        {graph.nodes.map(node => <NodeCard key={node.id} node={node} graph={graph} issues={[...validation.errors, ...validation.warnings].filter(i => i.nodeId === node.id)} onUpdate={updateNode} onDelete={deleteNode} onSetStart={setStart} onSetKind={setKind} onAddChoice={addChoice} onUpdateChoice={updateChoice} onDeleteChoice={deleteChoice} />)}
        <div className="add-node-row"><button className="secondary-btn" onClick={() => addNode('passage')}><Plus size={15} />添加段落</button><button className="secondary-btn" onClick={() => addNode('ending')}><Flag size={15} />添加结局</button></div>
      </div>
      <aside className="branch-rail">
        <div className="rail-block">
          <span className="eyebrow">PUBLISH / 发布</span>
          <h3>{liveVersion ? `v${liveVersion.version} 正在线上` : '还没有发布版本'}</h3>
          <p>{liveVersion ? `读者看到的是 ${formatDate(liveVersion.publishedAt)} 发布的快照，之后的草稿修改不会影响他们。` : '发布后，读者将看到一份稳定的内容快照；你可以随时撤回。'}</p>
          <div className="rail-line"></div>
          <div className="stat-row"><span>段落 / 结局</span><strong>{graph.nodes.filter(n => n.kind !== 'ending').length} / {graph.nodes.filter(n => n.kind === 'ending').length}</strong></div>
          <div className="stat-row"><span>待解决问题</span><strong>{validation.errors.length}</strong></div>
          <div className="stat-row"><span>提醒</span><strong>{validation.warnings.length}</strong></div>
        </div>
        <div className="rail-block">
          <span className="eyebrow">VERSIONS / 版本</span>
          {data.versions.length === 0 && <p className="rail-empty">还没有发布过版本。</p>}
          {data.versions.map(v => <div key={v.id} className="version-row">
            <div><strong>v{v.version}</strong><span className={`status-pill ${v.status}`}>{v.status === 'live' ? '线上' : v.status === 'retracted' ? '已撤回' : '已被取代'}</span></div>
            <span className="version-time">{formatDate(v.publishedAt)}</span>
            <div className="version-actions"><button className="text-btn" onClick={() => setPlay({ mode: 'version', versionId: v.id, versionNumber: v.version })}>试玩</button>{v.status === 'live' && <button className="text-btn danger" onClick={() => retract(v)}><Undo2 size={13} />撤回</button>}</div>
          </div>)}
        </div>
      </aside>
    </div>
    {play && <Playtester project={project} mode={play.mode} versionId={play.versionId} versionNumber={play.versionNumber} onClose={() => setPlay(null)} onNotice={onNotice} />}
  </div>
}

function NodeCard({ node, graph, issues, onUpdate, onDelete, onSetStart, onSetKind, onAddChoice, onUpdateChoice, onDeleteChoice }) {
  const isStart = graph.startNodeId === node.id
  return <div className={`node-card ${node.kind} ${isStart ? 'is-start' : ''}`}>
    <div className="node-card-head">
      <button className={`start-flag ${isStart ? 'active' : ''}`} onClick={() => onSetStart(node.id)} title="读者从这里开始"><Flag size={12} />{isStart ? '起点' : '设为起点'}</button>
      <input className="node-title" value={node.title} onChange={e => onUpdate(node.id, { title: e.target.value })} placeholder="段落标题" />
      <div className="kind-toggle"><button className={node.kind !== 'ending' ? 'active' : ''} onClick={() => onSetKind(node.id, 'passage')}>段落</button><button className={node.kind === 'ending' ? 'active' : ''} onClick={() => onSetKind(node.id, 'ending')}>结局</button></div>
      <button className="icon-btn tiny" onClick={() => onDelete(node.id)} aria-label="删除节点"><Trash2 size={14} /></button>
    </div>
    <textarea className="node-text" value={node.text} onChange={e => onUpdate(node.id, { text: e.target.value })} placeholder="这一段的故事…" rows={3} />
    {node.kind !== 'ending' && <div className="choice-list">
      {node.choices.map(choice => <div key={choice.id} className="choice-row">
        <ChevronRight size={14} className="choice-arrow" />
        <input value={choice.label} onChange={e => onUpdateChoice(node.id, choice.id, { label: e.target.value })} placeholder="选项文字，如：点亮信号灯" />
        <select value={choice.targetId} onChange={e => onUpdateChoice(node.id, choice.id, { targetId: e.target.value })}>
          <option value="">选择去向…</option>
          {graph.nodes.map(n => <option key={n.id} value={n.id}>{n.id === node.id ? '↺ ' : ''}{n.title || '未命名'}{n.kind === 'ending' ? '（结局）' : ''}</option>)}
        </select>
        <button className="icon-btn tiny" onClick={() => onDeleteChoice(node.id, choice.id)} aria-label="删除选项"><X size={13} /></button>
      </div>)}
      <button className="text-btn add-choice" onClick={() => onAddChoice(node.id)}><Plus size={14} />添加选项</button>
    </div>}
    {issues.map((issue, i) => <p key={i} className={`node-issue ${issue.code === 'UNREACHABLE' || issue.code === 'HAS_LOOP' ? 'warning' : 'error'}`}><AlertTriangle size={13} />{issue.message}</p>)}
  </div>
}

// ---------- 试玩器 ----------
function Playtester({ project, mode, versionId, versionNumber, onClose, onNotice }) {
  const [session, setSession] = useState(null)
  const [pending, setPending] = useState(null)
  const [offline, setOffline] = useState(false)
  const [bootError, setBootError] = useState(null)
  const storageKey = `novelverse-play-${project.id}-${mode}-${versionId || 'live'}`

  const start = useCallback(async (fresh = false) => {
    setBootError(null); setPending(null); setOffline(false)
    if (!fresh) {
      const savedId = localStorage.getItem(storageKey)
      if (savedId) {
        try { const { session } = await api(`/projects/${project.id}/branch/sessions/${savedId}`); if (session.status === 'playing') { setSession(session); return } } catch { /* 会话已失效，开新局 */ }
        localStorage.removeItem(storageKey)
      }
    } else localStorage.removeItem(storageKey)
    try {
      const { session } = await api(`/projects/${project.id}/branch/sessions`, { method: 'POST', body: JSON.stringify({ mode, versionId }) })
      setSession(session); localStorage.setItem(storageKey, session.id)
    } catch (error) { setBootError(error.message) }
  }, [project.id, mode, versionId, storageKey])
  useEffect(() => { start() }, [start])

  const submitChoice = async (sessionId, choiceId, token, step) => {
    try {
      const payload = await api(`/projects/${project.id}/branch/sessions/${sessionId}/choices`, { method: 'POST', body: JSON.stringify({ choiceId, token, expectedStep: step }) })
      setSession(payload.session); setPending(null); setOffline(false)
      if (payload.session.status !== 'playing') localStorage.removeItem(storageKey)
    } catch (error) {
      if (error.session) { setSession(error.session); setPending(null); if (error.error !== 'LOOP_LIMIT') onNotice({ type: 'error', text: error.message }) }
      else if (error.status) { setPending(null); onNotice({ type: 'error', text: error.message }) }
      else setOffline(true) // 网络中断：保留 pending，用同一 token 重试
    }
  }

  const choose = choice => {
    if (pending || !session || session.status !== 'playing') return // 重复点击保护
    const token = crypto.randomUUID()
    setPending({ choiceId: choice.id, token })
    submitChoice(session.id, choice.id, token, session.step)
  }
  const retry = () => { if (pending && session) submitChoice(session.id, pending.choiceId, pending.token, session.step) }

  const modeLabel = mode === 'preview' ? 'PREVIEW · 草稿预览' : mode === 'published' ? `READER · 发布版 v${session?.versionNumber ?? versionNumber ?? ''}` : `VERSION · v${session?.versionNumber ?? versionNumber ?? ''}`
  const finished = session && session.status !== 'playing'
  return <div className="play-backdrop">
    <div className="play-shell">
      <header className="play-head">
        <div><span className="eyebrow">{modeLabel}</span><strong>{project.title}</strong></div>
        <div className="play-head-actions">
          {session && !finished && <span className="play-step">第 {session.step} 步 · 上限 {session.maxSteps}</span>}
          <button className="secondary-btn" onClick={() => start(true)}><RotateCcw size={14} />重新开始</button>
          <button className="icon-btn" onClick={onClose} aria-label="关闭试玩"><X size={18} /></button>
        </div>
      </header>
      {offline && <div className="play-offline"><WifiOff size={15} /><span>网络连接中断，你的选择还没有提交。</span><button className="primary-btn" onClick={retry}>重新提交</button></div>}
      {bootError ? <div className="play-boot-error"><AlertTriangle size={20} /><p>{bootError}</p><button className="secondary-btn" onClick={onClose}>返回</button></div>
        : !session ? <div className="editor-loading"><div className="spinner small"></div>正在进入故事…</div>
        : finished ? <PlaySummary session={session} onRestart={() => start(true)} onClose={onClose} />
        : <>
          <div className="play-trail">{session.trail.map((t, i) => <React.Fragment key={i}>{i > 0 && <ChevronRight size={12} className="trail-sep" />}<span className={`trail-chip ${t.kind} ${t.revisited ? 'revisited' : ''}`}>{t.title}{t.revisited && ' ↺'}</span></React.Fragment>)}</div>
          <article className="play-node">
            <span className="eyebrow">{session.currentNode.kind === 'ending' ? '结局' : `段落 · 第 ${session.step + 1} 幕`}</span>
            <h2>{session.currentNode.title || '未命名'}</h2>
            {(session.currentNode.text || '').split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          </article>
          <div className="play-choices">
            {session.currentNode.choices.length === 0 && <p className="play-dead"><AlertTriangle size={14} />这里没有出口——草稿可能还没写完。</p>}
            {session.currentNode.choices.map(choice => <button key={choice.id} className="play-choice" disabled={Boolean(pending)} onClick={() => choose(choice)}><span>{pending?.choiceId === choice.id ? '提交中…' : choice.label || '（未命名选项）'}</span><ChevronRight size={15} /></button>)}
          </div>
        </>}
    </div>
  </div>
}

function PlaySummary({ session, onRestart, onClose }) {
  const { summary, trail } = session
  const looped = session.status === 'loop-limited'
  return <div className="play-summary">
    <span className="eyebrow">{looped ? 'LOOP LIMIT · 已达步数上限' : 'THE END · 试玩结束'}</span>
    <h2>{summary.ending ? summary.ending.title : '旅程在循环中暂停'}</h2>
    {summary.ending?.text && <p className="ending-text">{summary.ending.text}</p>}
    {looped && <p className="loop-note"><AlertTriangle size={14} />检测到可能的循环路径，试玩在 {session.maxSteps} 步后自动收尾。</p>}
    <div className="summary-grid">
      <section>
        <h3><Footprints size={15} />经过的节点 · {trail.length}</h3>
        <ol className="trail-list">{trail.map(t => <li key={t.order} className={t.kind}><span className="trail-order">{t.order}</span><span className="trail-title">{t.title}</span>{t.kind === 'ending' && <Flag size={12} />}{t.revisited && <em>重访</em>}</li>)}</ol>
      </section>
      <section>
        <h3><KeyRound size={15} />影响结局的关键选择 · {summary.keyChoices.length}</h3>
        {summary.keyChoices.length === 0 ? <p className="summary-muted">这次旅程中，每个分岔都通向相同的命运。</p> : <ul className="key-list">{summary.keyChoices.map((k, i) => <li key={i}>
          <strong>第 {k.step} 步 · {k.nodeTitle}</strong>
          <p>选择「{k.choiceLabel}」→ 可能走向：{k.chosenEndings.length ? k.chosenEndings.join('、') : '（没有结局）'}</p>
          {k.otherEndings.length > 0 && <p className="alt">若走另一条路：{k.otherEndings.join('、')}</p>}
        </li>)}</ul>}
      </section>
    </div>
    <div className="summary-stats"><span>总步数 <strong>{summary.totalSteps}</strong></span><span>经过节点 <strong>{trail.length}</strong></span><span>关键选择 <strong>{summary.keyChoices.length}</strong></span></div>
    <div className="summary-actions"><button className="secondary-btn" onClick={onClose}>退出试玩</button><button className="primary-btn" onClick={onRestart}><RotateCcw size={14} />再玩一次</button></div>
  </div>
}

function CreateProjectModal({ onClose, onCreated, onError }) { const [form, setForm] = useState({ title: '', description: '', visibility: 'private', cover: null }); const [coverError, setCoverError] = useState(''); const [saving, setSaving] = useState(false); const update = (key, value) => setForm(state => ({ ...state, [key]: value })); const onCover = event => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { setCoverError('封面需要是图片文件'); return } if (file.size > 4 * 1024 * 1024) { setCoverError('封面不能超过 4MB'); return } setCoverError(''); const reader = new FileReader(); reader.onload = () => update('cover', { kind: 'image', value: reader.result, name: file.name }); reader.readAsDataURL(file) }; const submit = async event => { event.preventDefault(); setSaving(true); try { const { project } = await api('/projects', { method: 'POST', body: JSON.stringify(form) }); onCreated(project) } catch (error) { onError(error) } finally { setSaving(false) } }; return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><div className="modal-header"><div><span className="eyebrow">NEW PROJECT / 01</span><h2 id="create-title">给故事一个名字</h2></div><button className="icon-btn" onClick={onClose} aria-label="关闭"><X size={19} /></button></div><form onSubmit={submit}><div className="cover-uploader"><div className="cover-preview">{form.cover?.value ? <img src={form.cover.value} alt="封面预览" /> : <><ImagePlus size={22} /><span>封面草稿</span></>}</div><div><label className="upload-btn"><ImagePlus size={15} />上传封面<input type="file" accept="image/png,image/jpeg,image/webp" onChange={onCover} /></label><p className="field-hint">PNG / JPG / WEBP，最大 4MB</p>{coverError && <p className="field-error">{coverError}</p>}</div></div><label>项目标题<span className="required">*</span><input autoFocus value={form.title} onChange={e => update('title', e.target.value)} placeholder="例如：盐与风的航线" required /></label><label>一句话简介<input value={form.description} onChange={e => update('description', e.target.value)} placeholder="这个故事会带你去哪里？" /></label><fieldset><legend>可见范围</legend><div className="visibility-options"><button type="button" className={form.visibility === 'private' ? 'selected' : ''} onClick={() => update('visibility', 'private')}><LockKeyhole size={16} /><span><strong>私密</strong><small>只有你能看到</small></span></button><button type="button" className={form.visibility === 'shared' ? 'selected' : ''} onClick={() => update('visibility', 'shared')}><Share2 size={16} /><span><strong>共享</strong><small>邀请后一起创作</small></span></button></div></fieldset><div className="modal-actions"><button type="button" className="text-btn" onClick={onClose}>稍后再说</button><button className="primary-btn" disabled={saving}>{saving ? '创建中…' : <><span>创建并开始写作</span><Send size={15} /></>}</button></div></form></div></div> }

createRoot(document.getElementById('root')).render(<App />)
