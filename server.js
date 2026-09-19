import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const dataFile = path.join(dataDir, 'store.json')
const PORT = process.env.PORT || 8787
const app = express()
app.use(express.json({ limit: '2mb' }))

const demoUser = { id: 'user-demo', name: '林舟', handle: 'linzhou', initials: 'LZ' }
const seed = {
  users: [demoUser],
  playSessions: [],
  projects: [
    {
      id: 'proj-salt-wind', title: '盐与风的航线', description: '在潮汐尽头，寻找一座不存在的岛。', visibility: 'private',
      cover: { kind: 'image', value: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', name: 'salt-wind.jpg' },
      ownerId: demoUser.id, createdAt: '2026-09-08T09:30:00.000Z', updatedAt: '2026-09-16T10:24:00.000Z',
      draft: { id: 'draft-salt-wind', content: '潮水退去以后，港口只剩下一种颜色。\n\n我把地图折成四份，塞进旧风衣的内袋。', version: 7, updatedAt: '2026-09-16T10:24:00.000Z' }, sharedStatus: 'private'
    },
    {
      id: 'proj-lanterns', title: '午夜图书馆', description: '每一本被遗忘的书，都在午夜后亮起一盏灯。', visibility: 'shared',
      cover: { kind: 'image', value: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80', name: 'library.jpg' },
      ownerId: demoUser.id, createdAt: '2026-08-22T12:10:00.000Z', updatedAt: '2026-09-12T16:40:00.000Z',
      draft: { id: 'draft-lanterns', content: '图书馆在午夜十二点准时醒来。', version: 3, updatedAt: '2026-09-12T16:40:00.000Z' }, sharedStatus: 'shared'
    }
  ]
}

async function readStore() {
  try { const store = JSON.parse(await fs.readFile(dataFile, 'utf8')); store.playSessions ||= []; return store } catch { await fs.mkdir(dataDir, { recursive: true }); await fs.writeFile(dataFile, JSON.stringify(seed, null, 2)); return structuredClone(seed) }
}
let writeQueue = Promise.resolve()
async function writeStore(store) { writeQueue = writeQueue.then(async () => { await fs.mkdir(dataDir, { recursive: true }); await fs.writeFile(dataFile, JSON.stringify(store, null, 2)) }); return writeQueue }
function requireUser(req, res) { const id = req.header('x-user-id') || req.query.userId; if (!id) { res.status(401).json({ error: 'UNAUTHENTICATED', message: '请先登录 Novelverse' }); return null } return id }
function now() { return new Date().toISOString() }

// ---------- 分支叙事 ----------
const MAX_PLAY_STEPS = 50 // 循环路径保护：单次试玩最多 50 步

function defaultBranch() {
  const id = `node-${crypto.randomUUID()}`
  return { startNodeId: id, nodes: [{ id, kind: 'passage', title: '开篇', text: '', choices: [] }], version: 0, updatedAt: now() }
}

function sampleBranch() {
  return {
    startNodeId: 'bn-harbor',
    nodes: [
      { id: 'bn-harbor', kind: 'passage', title: '港口清晨', text: '潮水退去以后，港口只剩下一种颜色。你把地图折成四份，塞进旧风衣的内袋。', choices: [
        { id: 'bc-board', label: '登上那艘旧帆船', targetId: 'bn-ship' },
        { id: 'bc-tower', label: '先去灯塔打听消息', targetId: 'bn-lighthouse' } ] },
      { id: 'bn-ship', kind: 'passage', title: '离岸的风', text: '帆绳在掌心勒出红印。海面像一页被反复涂改的稿纸。', choices: [
        { id: 'bc-storm', label: '迎着风暴直行', targetId: 'bn-storm' },
        { id: 'bc-along', label: '沿着灯标慢慢绕行', targetId: 'bn-lighthouse' },
        { id: 'bc-circle', label: '犹豫着在海上兜圈', targetId: 'bn-ship' } ] },
      { id: 'bn-storm', kind: 'passage', title: '风暴眼', text: '浪比桅杆更高。你听见船骨在深处呻吟。', choices: [
        { id: 'bc-crash', label: '收帆硬闯过去', targetId: 'bn-wreck' },
        { id: 'bc-back', label: '掉头退回风小的海域', targetId: 'bn-ship' } ] },
      { id: 'bn-lighthouse', kind: 'passage', title: '灯塔守夜人', text: '守夜人递给你一杯烫手的茶：「灯亮着，岛就在；灯灭了，岛就躲起来。」', choices: [
        { id: 'bc-light', label: '点亮信号灯', targetId: 'bn-island' },
        { id: 'bc-dark', label: '让灯保持熄灭', targetId: 'bn-storm' } ] },
      { id: 'bn-island', kind: 'ending', title: '不存在的岛', text: '灯亮的那一刻，海平线上浮起一座岛的轮廓。地图上没有它，但你的风衣口袋里有。', choices: [] },
      { id: 'bn-wreck', kind: 'ending', title: '沉睡的船骸', text: '船在黎明前安静下来。许多年后，潜水的人会在船舱里找到半张被盐水泡软的地图。', choices: [] },
      { id: 'bn-bottle', kind: 'ending', title: '漂流瓶', text: '没有人读到过这封信。它只是一直漂，一直漂。', choices: [] }
    ],
    version: 0, updatedAt: now()
  }
}

function ensureBranch(project) {
  if (!project.branch) project.branch = { draft: project.id === 'proj-salt-wind' ? sampleBranch() : defaultBranch(), versions: [] }
  if (!project.branch.draft || !Array.isArray(project.branch.draft.nodes)) project.branch.draft = defaultBranch()
  if (!Array.isArray(project.branch.versions)) project.branch.versions = []
  return project.branch
}

const graphIndex = graph => new Map((graph.nodes || []).map(n => [n.id, n]))

function reachableFrom(graph, startId) {
  const index = graphIndex(graph); const seen = new Set(); const queue = [startId]
  while (queue.length) { const id = queue.shift(); if (!id || seen.has(id)) continue; seen.add(id); const node = index.get(id); if (!node) continue; for (const c of node.choices || []) queue.push(c.targetId) }
  return seen
}

function reachableEndings(graph, startId) {
  const index = graphIndex(graph); const endings = new Set(); const seen = new Set(); const queue = [startId]
  while (queue.length) {
    const id = queue.shift(); if (!id || seen.has(id)) continue; seen.add(id)
    const node = index.get(id); if (!node) continue
    if (node.kind === 'ending') { endings.add(node.id); continue }
    for (const c of node.choices || []) queue.push(c.targetId)
  }
  return endings
}

function hasCycle(graph) {
  const index = graphIndex(graph); const state = new Map() // 0 = 在栈中, 1 = 已完成
  const visit = id => {
    if (state.get(id) === 0) return true
    if (state.has(id)) return false
    state.set(id, 0)
    const node = index.get(id)
    for (const c of node?.choices || []) if (index.has(c.targetId) && visit(c.targetId)) return true
    state.set(id, 1); return false
  }
  return graph.startNodeId ? visit(graph.startNodeId) : false
}

function validateGraph(graph) {
  const errors = []; const warnings = []
  const nodes = graph.nodes || []
  if (!nodes.length) { errors.push({ code: 'EMPTY_GRAPH', message: '还没有任何段落节点' }); return { errors, warnings } }
  const index = graphIndex(graph)
  if (index.size !== nodes.length) errors.push({ code: 'DUP_NODE', message: '存在重复的节点标识' })
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
    const reachable = reachableFrom(graph, graph.startNodeId)
    for (const n of nodes) if (!reachable.has(n.id)) warnings.push({ code: 'UNREACHABLE', nodeId: n.id, message: `「${n.title || '未命名'}」从起点无法到达（断开的节点）` })
    if (![...reachable].some(id => index.get(id)?.kind === 'ending')) errors.push({ code: 'NO_ENDING', message: '从起点出发无法到达任何结局' })
    if (hasCycle(graph)) warnings.push({ code: 'HAS_LOOP', message: `故事存在循环路径，试玩将在 ${MAX_PLAY_STEPS} 步后自动收尾` })
  }
  return { errors, warnings }
}

function sanitizeGraph(input) {
  const rawNodes = Array.isArray(input?.nodes) ? input.nodes.slice(0, 200) : []
  const nodes = []; const seen = new Set()
  for (const raw of rawNodes) {
    const id = typeof raw?.id === 'string' && raw.id && !seen.has(raw.id) ? raw.id : `node-${crypto.randomUUID()}`
    seen.add(id)
    const kind = raw?.kind === 'ending' ? 'ending' : 'passage'
    const choices = kind === 'ending' ? [] : (Array.isArray(raw?.choices) ? raw.choices.slice(0, 8) : []).map(c => ({
      id: typeof c?.id === 'string' && c.id ? c.id : `choice-${crypto.randomUUID()}`,
      label: String(c?.label ?? '').slice(0, 40),
      targetId: typeof c?.targetId === 'string' ? c.targetId : ''
    }))
    nodes.push({ id, kind, title: String(raw?.title ?? '').slice(0, 60), text: String(raw?.text ?? '').slice(0, 5000), choices })
  }
  const startNodeId = typeof input?.startNodeId === 'string' && nodes.some(n => n.id === input.startNodeId) ? input.startNodeId : (nodes[0]?.id || null)
  return { startNodeId, nodes }
}

// 关键选择：路径上“换一条路就可能走向别的结局”的分岔
function analyzeKeyChoices(graph, path) {
  const index = graphIndex(graph); const keys = []
  path.forEach((step, i) => {
    const node = index.get(step.nodeId)
    if (!node || (node.choices || []).length < 2) return
    const chosen = node.choices.find(c => c.id === step.choiceId)
    if (!chosen) return
    const chosenEndings = reachableEndings(graph, chosen.targetId)
    const altEndings = new Set()
    for (const c of node.choices) if (c.id !== step.choiceId) for (const e of reachableEndings(graph, c.targetId)) altEndings.add(e)
    const same = chosenEndings.size === altEndings.size && [...chosenEndings].every(e => altEndings.has(e))
    if (same) return
    const titleOf = id => index.get(id)?.title || '未知结局'
    keys.push({ step: i + 1, nodeId: node.id, nodeTitle: node.title || '未命名', choiceLabel: chosen.label || '未命名选项', chosenEndings: [...chosenEndings].map(titleOf), otherEndings: [...altEndings].filter(e => !chosenEndings.has(e)).map(titleOf) })
  })
  return keys
}

function sessionSummary(session) {
  const index = graphIndex(session.graph)
  const ending = session.endingNodeId ? index.get(session.endingNodeId) : null
  return {
    status: session.status,
    totalSteps: session.path.length,
    ending: ending ? { nodeId: ending.id, title: ending.title, text: ending.text } : null,
    keyChoices: analyzeKeyChoices(session.graph, session.path)
  }
}

function sessionView(session) {
  const index = graphIndex(session.graph)
  const current = index.get(session.currentNodeId)
  const trailIds = [session.graph.startNodeId, ...session.path.map(p => p.targetId)]
  const trail = trailIds.map((id, i) => { const n = index.get(id); return { order: i + 1, nodeId: id, title: n?.title || '未知段落', kind: n?.kind || 'passage', revisited: trailIds.indexOf(id) !== i } })
  return {
    id: session.id, mode: session.mode, versionId: session.versionId, versionNumber: session.versionNumber,
    status: session.status, step: session.path.length, maxSteps: MAX_PLAY_STEPS,
    currentNode: current ? { id: current.id, kind: current.kind, title: current.title, text: current.text, choices: (current.choices || []).map(c => ({ id: c.id, label: c.label })) } : null,
    trail,
    summary: session.status === 'playing' ? null : sessionSummary(session)
  }
}


app.get('/api/me', (req, res) => res.json({ user: demoUser }))
app.get('/api/projects', async (req, res) => { const userId = requireUser(req, res); if (!userId) return; const store = await readStore(); res.json({ projects: store.projects.filter(p => p.ownerId === userId) }) })
app.post('/api/projects', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return
  const { title, description = '', visibility = 'private', cover = null } = req.body || {}
  const cleanTitle = String(title || '').trim(); if (!cleanTitle) return res.status(400).json({ error: 'TITLE_REQUIRED', message: '请填写项目标题' })
  const store = await readStore(); if (store.projects.some(p => p.ownerId === userId && p.title.toLowerCase() === cleanTitle.toLowerCase())) return res.status(409).json({ error: 'DUPLICATE_PROJECT', message: '已经有同名项目了' })
  const projectId = `proj-${crypto.randomUUID()}`; const draftId = `draft-${crypto.randomUUID()}`; const timestamp = now()
  const project = { id: projectId, title: cleanTitle, description: String(description).trim(), visibility: visibility === 'shared' ? 'shared' : 'private', cover, ownerId: userId, createdAt: timestamp, updatedAt: timestamp, draft: { id: draftId, content: '', version: 0, updatedAt: timestamp }, sharedStatus: visibility === 'shared' ? 'shared' : 'private' }
  store.projects.unshift(project); await writeStore(store); res.status(201).json({ project })
})
app.patch('/api/projects/:id', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return; const store = await readStore(); const project = store.projects.find(p => p.id === req.params.id && p.ownerId === userId); if (!project) return res.status(404).json({ error: 'NOT_FOUND', message: '项目不存在' })
  const { title, description, visibility, cover } = req.body || {}; if (title !== undefined) project.title = String(title).trim(); if (description !== undefined) project.description = String(description).trim(); if (visibility !== undefined) project.visibility = visibility === 'shared' ? 'shared' : 'private'; if (cover !== undefined) project.cover = cover; project.updatedAt = now(); project.sharedStatus = project.visibility; await writeStore(store); res.json({ project })
})
app.get('/api/projects/:id/draft', async (req, res) => { const userId = requireUser(req, res); if (!userId) return; const store = await readStore(); const project = store.projects.find(p => p.id === req.params.id && p.ownerId === userId); if (!project) return res.status(404).json({ error: 'NOT_FOUND', message: '草稿不存在' }); res.json({ draft: project.draft }) })
app.put('/api/projects/:id/draft', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return; const store = await readStore(); const project = store.projects.find(p => p.id === req.params.id && p.ownerId === userId); if (!project) return res.status(404).json({ error: 'NOT_FOUND', message: '项目不存在' })
  const { content = '', baseVersion = 0 } = req.body || {}; if (Number(baseVersion) !== Number(project.draft.version)) return res.status(409).json({ error: 'DRAFT_CONFLICT', message: '这份草稿在另一台设备上有更新', serverDraft: project.draft })
  const draft = { ...project.draft, content: String(content), version: Number(project.draft.version) + 1, updatedAt: now() }; project.draft = draft; project.updatedAt = draft.updatedAt; await writeStore(store); res.json({ draft })
})
app.post('/api/projects/:id/share', async (req, res) => { const userId = requireUser(req, res); if (!userId) return; const store = await readStore(); const project = store.projects.find(p => p.id === req.params.id && p.ownerId === userId); if (!project) return res.status(404).json({ error: 'NOT_FOUND', message: '项目不存在' }); project.visibility = project.visibility === 'shared' ? 'private' : 'shared'; project.sharedStatus = project.visibility; project.updatedAt = now(); await writeStore(store); res.json({ project }) })

// ---------- 分支叙事 API ----------
const findProject = async (req, res) => { const store = await readStore(); const project = store.projects.find(p => p.id === req.params.id && p.ownerId === req.header('x-user-id')); if (!project) { res.status(404).json({ error: 'NOT_FOUND', message: '项目不存在' }); return null } return { store, project } }

app.get('/api/projects/:id/branch', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return
  const found = await findProject(req, res); if (!found) return
  const { store, project } = found; const branch = ensureBranch(project)
  await writeStore(store) // 持久化惰性初始化的草稿，保证节点 id 稳定
  res.json({ draft: branch.draft, versions: branch.versions, validation: validateGraph(branch.draft) })
})

app.put('/api/projects/:id/branch', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return
  const found = await findProject(req, res); if (!found) return
  const { store, project } = found; const branch = ensureBranch(project)
  const { graph, baseVersion = 0 } = req.body || {}
  if (Number(baseVersion) !== Number(branch.draft.version)) return res.status(409).json({ error: 'BRANCH_CONFLICT', message: '分支草稿在另一处被修改过', serverDraft: branch.draft })
  const clean = sanitizeGraph(graph)
  const draft = { ...clean, version: Number(branch.draft.version) + 1, updatedAt: now() }
  branch.draft = draft; project.updatedAt = draft.updatedAt
  // 保存草稿时把线上版本同步到最新内容，避免读者读到过期版本
  const liveVersion = branch.versions.find(v => v.status === 'live')
  if (liveVersion) liveVersion.snapshot = structuredClone({ startNodeId: draft.startNodeId, nodes: draft.nodes })
  await writeStore(store)
  res.json({ draft, versions: branch.versions, validation: validateGraph(draft) })
})

app.post('/api/projects/:id/branch/publish', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return
  const found = await findProject(req, res); if (!found) return
  const { store, project } = found; const branch = ensureBranch(project)
  const { baseVersion = 0 } = req.body || {}
  if (Number(baseVersion) !== Number(branch.draft.version)) return res.status(409).json({ error: 'PUBLISH_CONFLICT', message: '草稿在发布过程中被修改，请刷新后重试', serverVersion: branch.draft.version })
  const validation = validateGraph(branch.draft)
  if (validation.errors.length) return res.status(422).json({ error: 'VALIDATION_FAILED', message: '还有未解决的问题，无法发布', validation })
  for (const v of branch.versions) if (v.status === 'live') v.status = 'superseded'
  const version = { id: `bv-${crypto.randomUUID()}`, version: branch.versions.reduce((max, v) => Math.max(max, v.version), 0) + 1, status: 'live', snapshot: structuredClone({ startNodeId: branch.draft.startNodeId, nodes: branch.draft.nodes }), sourceDraftVersion: branch.draft.version, publishedAt: now(), retractedAt: null }
  branch.versions.unshift(version); project.updatedAt = now()
  await writeStore(store)
  res.status(201).json({ version, versions: branch.versions, validation })
})

app.post('/api/projects/:id/branch/versions/:vid/retract', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return
  const found = await findProject(req, res); if (!found) return
  const { store, project } = found; const branch = ensureBranch(project)
  const version = branch.versions.find(v => v.id === req.params.vid)
  if (!version) return res.status(404).json({ error: 'VERSION_NOT_FOUND', message: '这个版本不存在' })
  if (version.status !== 'live') return res.status(409).json({ error: 'NOT_LIVE', message: '只有当前线上版本可以撤回' })
  version.status = 'retracted'; version.retractedAt = now(); project.updatedAt = now()
  await writeStore(store)
  res.json({ version, versions: branch.versions })
})

app.get('/api/projects/:id/branch/published', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return
  const found = await findProject(req, res); if (!found) return
  const { project } = found; const branch = ensureBranch(project)
  const live = branch.versions.find(v => v.status === 'live')
  if (!live) return res.status(404).json({ error: 'NO_LIVE_VERSION', message: '作者还没有发布可试玩的版本' })
  res.json({ version: { id: live.id, version: live.version, publishedAt: live.publishedAt }, graph: live.snapshot })
})

app.post('/api/projects/:id/branch/sessions', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return
  const found = await findProject(req, res); if (!found) return
  const { store, project } = found; const branch = ensureBranch(project)
  const { mode = 'preview', versionId } = req.body || {}
  let graph, pinnedVersionId = null, versionNumber = null, sessionMode = 'preview'
  if (mode === 'published') {
    const live = branch.versions.find(v => v.status === 'live')
    if (!live) return res.status(404).json({ error: 'NO_LIVE_VERSION', message: '还没有已发布的版本，请先发布一版' })
    graph = live.snapshot; pinnedVersionId = live.id; versionNumber = live.version; sessionMode = 'published'
  } else if (mode === 'version') {
    const v = branch.versions.find(v => v.id === versionId)
    if (!v) return res.status(404).json({ error: 'VERSION_NOT_FOUND', message: '这个版本不存在或已被清理' })
    graph = v.snapshot; pinnedVersionId = v.id; versionNumber = v.version; sessionMode = 'version'
  } else {
    graph = branch.draft
    if (!graph.nodes?.length) return res.status(422).json({ error: 'EMPTY_GRAPH', message: '草稿还是空的，先添加一个段落吧' })
  }
  if (!graph.nodes.some(n => n.id === graph.startNodeId)) return res.status(422).json({ error: 'NO_START', message: '缺少有效的起始段落，无法试玩' })
  // 把图快照钉进会话：之后无论草稿修改、版本撤回，本次试玩内容都保持稳定
  const session = { id: `play-${crypto.randomUUID()}`, projectId: project.id, userId, mode: sessionMode, versionId: pinnedVersionId, versionNumber, graph: structuredClone({ startNodeId: graph.startNodeId, nodes: graph.nodes }), currentNodeId: graph.startNodeId, path: [], appliedTokens: [], status: 'playing', endingNodeId: null, createdAt: now(), updatedAt: now() }
  store.playSessions.push(session)
  if (store.playSessions.length > 200) store.playSessions = store.playSessions.slice(-200)
  await writeStore(store)
  res.status(201).json({ session: sessionView(session) })
})

const findSession = async (req, res) => {
  const store = await readStore()
  const session = store.playSessions.find(s => s.id === req.params.sid && s.projectId === req.params.id && s.userId === req.header('x-user-id'))
  if (!session) { res.status(404).json({ error: 'SESSION_NOT_FOUND', message: '试玩会话不存在或已过期' }); return null }
  // 读取会话时对齐到作者当前的线上版本（线上版本已撤回则回退到草稿），保证读者读到最新内容
  const sessionProject = store.projects.find(p => p.id === session.projectId)
  if (sessionProject && session.mode !== 'preview') {
    const branch = ensureBranch(sessionProject)
    const live = branch.versions.find(v => v.status === 'live')
    const source = live ? live.snapshot : branch.draft
    session.graph = structuredClone({ startNodeId: source.startNodeId, nodes: source.nodes })
  }
  return { store, session }
}

app.get('/api/projects/:id/branch/sessions/:sid', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return
  const found = await findSession(req, res); if (!found) return
  res.json({ session: sessionView(found.session) })
})

app.post('/api/projects/:id/branch/sessions/:sid/choices', async (req, res) => {
  const userId = requireUser(req, res); if (!userId) return
  const found = await findSession(req, res); if (!found) return
  const { store, session } = found
  const { choiceId, token, expectedStep } = req.body || {}
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'TOKEN_REQUIRED', message: '缺少提交令牌' })
  // 幂等：同一 token 重复提交（双击、重试、网络重发）只生效一次
  if (session.appliedTokens.some(t => t.token === token)) return res.json({ session: sessionView(session), deduplicated: true })
  if (session.status !== 'playing') return res.status(409).json({ error: 'SESSION_FINISHED', message: '本次试玩已经结束', session: sessionView(session) })
  if (Number(expectedStep) !== session.path.length) return res.status(409).json({ error: 'STEP_CONFLICT', message: '进度已变化，已为你同步最新状态', session: sessionView(session) })
  if (session.path.length >= MAX_PLAY_STEPS) {
    session.status = 'loop-limited'; session.updatedAt = now(); await writeStore(store)
    return res.status(422).json({ error: 'LOOP_LIMIT', message: `已达到 ${MAX_PLAY_STEPS} 步上限，可能存在循环路径`, session: sessionView(session) })
  }
  const index = graphIndex(session.graph)
  const current = index.get(session.currentNodeId)
  if (!current) return res.status(500).json({ error: 'NODE_MISSING', message: '当前段落不存在' })
  const choice = (current.choices || []).find(c => c.id === choiceId)
  if (!choice) return res.status(400).json({ error: 'ILLEGAL_JUMP', message: '这个选项不属于当前段落，已为你同步', session: sessionView(session) })
  const target = index.get(choice.targetId)
  if (!target) return res.status(422).json({ error: 'BROKEN_TARGET', message: '这个选项指向的段落不存在（草稿可能未完善）', session: sessionView(session) })
  session.path.push({ nodeId: current.id, choiceId: choice.id, choiceLabel: choice.label, targetId: target.id })
  session.currentNodeId = target.id
  session.appliedTokens.push({ token, at: now() })
  if (target.kind === 'ending') { session.status = 'finished'; session.endingNodeId = target.id }
  session.updatedAt = now()
  await writeStore(store)
  res.json({ session: sessionView(session) })
})

app.use(express.static(path.join(__dirname, 'dist')))
app.get(/.*/, (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.join(__dirname, 'dist', 'index.html')))
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'SERVER_ERROR', message: '服务器暂时开小差了' }) })
app.listen(PORT, () => console.log(`Novelverse API running at http://localhost:${PORT}`))
