import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = 5050
const SECRET_PATH = 'preview'
const basePath = '/' + SECRET_PATH

// ============== 模拟数据 ==============
let nextId = 100
const genId = () => ++nextId

const shops = [
  { id: 1, shop_name: '潮流服饰专营店', shop_no: 'DY700123456', app_key: 'app_key_001', app_secret: 'app_secret_001', status: 'active', remark: '主营服饰配件', created_at: '2026-09-01T10:00:00Z' },
  { id: 2, shop_name: '数码配件旗舰店', shop_no: 'DY700654321', app_key: 'app_key_002', app_secret: 'app_secret_002', status: 'active', remark: '主营数码配件', created_at: '2026-09-01T10:00:00Z' },
  { id: 3, shop_name: '日用百货精选店', shop_no: 'DY700789012', app_key: 'app_key_003', app_secret: 'app_secret_003', status: 'inactive', remark: '主营日用百货', created_at: '2026-09-01T10:00:00Z' },
]
const suppliers = [
  { id: 1, name: '义乌市鼎盛商贸有限公司', contact: '王经理', phone: '13805791234', wechat: 'wx_dingsheng', email: 'dingsheng@example.com', address: '浙江省义乌市国际商贸城D区3楼', order_link: 'https://www.1688.com/order/dingsheng', status: 'active', remark: '主营日用百货，支持一件代发', created_at: '2026-09-01T10:00:00Z' },
  { id: 2, name: '广州潮流服饰有限公司', contact: '李总', phone: '13902012345', wechat: 'wx_chaoliu', email: 'chaoliu@example.com', address: '广东省广州市白云区石井街道', order_link: 'https://www.1688.com/order/chaoliu', status: 'active', remark: '主营时尚服饰，发货速度快', created_at: '2026-09-01T10:00:00Z' },
  { id: 3, name: '深圳数码配件工厂', contact: '陈工', phone: '13707551234', wechat: 'wx_shuma', email: 'shuma@example.com', address: '广东省深圳市宝安区西乡街道', order_link: 'https://www.1688.com/order/shuma', status: 'active', remark: '手机配件直供，量大从优', created_at: '2026-09-01T10:00:00Z' },
]
const products = [
  { id: 1, supplier_id: 1, sku: 'SKU-RZ-001', name: '硅胶揉捏减压球（3件套）', supplier_sku: 'RZ-001', cost_price: 2.50, sale_price: 9.90, stock: 500, spec: '3件套', image_url: '', status: 'active', remark: '减压玩具', created_at: '2026-09-01T10:00:00Z', supplier: suppliers[0] },
  { id: 2, supplier_id: 1, sku: 'SKU-RZ-002', name: '创意木制收纳盒', supplier_sku: 'RZ-002', cost_price: 8.80, sale_price: 19.90, stock: 200, spec: '中号', image_url: '', status: 'active', remark: '桌面收纳', created_at: '2026-09-01T10:00:00Z', supplier: suppliers[0] },
  { id: 3, supplier_id: 1, sku: 'SKU-RZ-003', name: '便携折叠衣架10个装', supplier_sku: 'RZ-003', cost_price: 3.20, sale_price: 12.90, stock: 0, spec: '10个装', image_url: '', status: 'inactive', remark: '旅行衣架', created_at: '2026-09-01T10:00:00Z', supplier: suppliers[0] },
  { id: 4, supplier_id: 2, sku: 'SKU-FZ-001', name: '纯棉宽松T恤（男女同款）', supplier_sku: 'FZ-001', cost_price: 15.00, sale_price: 39.90, stock: 800, spec: '多色可选', image_url: '', status: 'active', remark: '多色可选', created_at: '2026-09-01T10:00:00Z', supplier: suppliers[1] },
  { id: 5, supplier_id: 2, sku: 'SKU-FZ-002', name: '高腰显瘦牛仔裤', supplier_sku: 'FZ-002', cost_price: 25.00, sale_price: 59.90, stock: 300, spec: '弹性面料', image_url: '', status: 'active', remark: '弹性面料', created_at: '2026-09-01T10:00:00Z', supplier: suppliers[1] },
  { id: 6, supplier_id: 2, sku: 'SKU-FZ-003', name: '春秋针织开衫外套', supplier_sku: 'FZ-003', cost_price: 18.50, sale_price: 45.00, stock: 150, spec: '韩版', image_url: '', status: 'active', remark: '韩版', created_at: '2026-09-01T10:00:00Z', supplier: suppliers[1] },
  { id: 7, supplier_id: 3, sku: 'SKU-SM-001', name: '快充数据线三合一', supplier_sku: 'SM-001', cost_price: 4.50, sale_price: 15.90, stock: 1000, spec: 'Type-C/Lightning/USB', image_url: '', status: 'active', remark: '三合一', created_at: '2026-09-01T10:00:00Z', supplier: suppliers[2] },
  { id: 8, supplier_id: 3, sku: 'SKU-SM-002', name: '蓝牙耳机TWS（降噪版）', supplier_sku: 'SM-002', cost_price: 35.00, sale_price: 89.00, stock: 80, spec: '主动降噪', image_url: '', status: 'active', remark: '主动降噪', created_at: '2026-09-01T10:00:00Z', supplier: suppliers[2] },
]
const orders = [
  { id: 1, shop_id: 3, order_no: 'DD20260901001', product_sku: 'SKU-RZ-001', product_name: '硅胶揉捏减压球（3件套）', spec: '3件套', quantity: 2, amount: 19.80, receiver: '张三', phone: '13800138001', customer_address: '北京市朝阳区建国路88号', status: 'pending', created_at: '2026-09-01T10:00:00Z' },
  { id: 2, shop_id: 1, order_no: 'DD20260901002', product_sku: 'SKU-FZ-001', product_name: '纯棉宽松T恤（男女同款）', spec: '多色可选', quantity: 1, amount: 39.90, receiver: '李四', phone: '13800138002', customer_address: '上海市浦东新区世纪大道100号', status: 'matched', created_at: '2026-09-01T10:00:00Z' },
  { id: 3, shop_id: 2, order_no: 'DD20260901003', product_sku: 'SKU-SM-001', product_name: '快充数据线三合一', spec: 'Type-C/Lightning/USB', quantity: 3, amount: 47.70, receiver: '王五', phone: '13800138003', customer_address: '广州市天河区体育西路191号', status: 'purchased', created_at: '2026-09-01T10:00:00Z' },
  { id: 4, shop_id: 1, order_no: 'DD20260902001', product_sku: 'SKU-FZ-002', product_name: '高腰显瘦牛仔裤', spec: '弹性面料', quantity: 1, amount: 59.90, receiver: '赵六', phone: '13800138004', customer_address: '杭州市西湖区文三路199号', status: 'shipped', created_at: '2026-09-02T10:00:00Z' },
  { id: 5, shop_id: 3, order_no: 'DD20260902002', product_sku: 'SKU-RZ-002', product_name: '创意木制收纳盒', spec: '中号', quantity: 2, amount: 39.80, receiver: '孙七', phone: '13800138005', customer_address: '成都市武侯区人民南路四段', status: 'completed', created_at: '2026-09-02T10:00:00Z' },
  { id: 6, shop_id: 2, order_no: 'DD20260903001', product_sku: 'SKU-SM-002', product_name: '蓝牙耳机TWS（降噪版）', spec: '主动降噪', quantity: 1, amount: 89.00, receiver: '周八', phone: '13800138006', customer_address: '深圳市南山区科技园南区', status: 'pending', created_at: '2026-09-03T10:00:00Z' },
]
const purchaseOrders = [
  { id: 1, po_no: 'PO17000000001', order_id: 1, supplier_id: 1, product_id: 1, quantity: 2, purchase_price: 2.50, total_amount: 5.00, status: 'pending', tracking_number: '', created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z', supplier: suppliers[0], product: products[0], order: orders[0] },
  { id: 2, po_no: 'PO17000000002', order_id: 2, supplier_id: 2, product_id: 4, quantity: 1, purchase_price: 15.00, total_amount: 15.00, status: 'ordered', tracking_number: 'SF1234567890', created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z', supplier: suppliers[1], product: products[3], order: orders[1] },
  { id: 3, po_no: 'PO17000000003', order_id: 3, supplier_id: 3, product_id: 7, quantity: 3, purchase_price: 4.50, total_amount: 13.50, status: 'shipped', tracking_number: 'YT9876543210', created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z', supplier: suppliers[2], product: products[6], order: orders[2] },
]

// ============== 工具函数 ==============
const ok = (data, message = '操作成功') => ({ success: true, message, data })
const fail = (message = '操作失败') => ({ success: false, message })
const paginate = (items, page, pageSize) => ({ items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, page_size: pageSize })
const parseId = (s) => parseInt(s) || 0

let validTokens = new Set()
let adminPassword = 'admin123'
const authRequired = (req) => {
  const auth = req.headers['authorization']
  if (!auth || !auth.startsWith('Bearer ')) return false
  return validTokens.has(auth.slice(7))
}

// ============== 路由处理 ==============
function handleApi(method, url, body, req) {
  const apiBase = `${basePath}/api`

  // Auth
  if (method === 'POST' && url === `${apiBase}/login`) {
    const { username, password } = body
    if (username === 'admin' && password === 'admin123') {
      const token = `mock-token-${Date.now()}`
      validTokens.add(token)
      return ok({ id: 1, username: 'admin', token }, '登录成功')
    }
    return { status: 401, json: fail('用户名或密码错误') }
  }
  if (method === 'POST' && url === `${apiBase}/logout`) {
    const auth = req.headers['authorization']
    if (auth && auth.startsWith('Bearer ')) validTokens.delete(auth.slice(7))
    return ok(null, '登出成功')
  }

  // 以下需要认证
  if (!authRequired(req)) return { status: 401, json: fail('未登录') }

  // Dashboard
  if (method === 'GET' && url === `${apiBase}/dashboard/stats`) {
    return ok({
      shop_count: shops.length, supplier_count: suppliers.length, product_count: products.length,
      order_count: orders.length, pending_order_count: orders.filter(o => o.status === 'pending').length,
      purchase_order_count: purchaseOrders.length, total_amount: orders.reduce((s, o) => s + o.amount, 0),
    })
  }
  if (method === 'GET' && url === `${apiBase}/dashboard/recent-orders`) {
    return ok(orders.filter(o => o.status === 'pending').slice(0, 5))
  }

  // Shops
  if (method === 'GET' && url.pathname === `${apiBase}/shops`) {
    let list = shops
    const { keyword, status, page = 1, pageSize = 20 } = url.query
    if (keyword) list = list.filter(s => s.shop_name.includes(keyword) || s.shop_no.includes(keyword))
    if (status) list = list.filter(s => s.status === status)
    return ok(paginate(list, +page, +pageSize))
  }
  if (method === 'GET' && url.pathname === `${apiBase}/shops/all`) return ok(shops.filter(s => s.status === 'active'))
  // ... (省略其他 shops 路由，模式相同)

  // 简化版路由匹配
  return null
}

// ============== HTTP 服务器 ==============
const server = http.createServer((req, res) => {
  const method = req.method
  const parsedUrl = new URL(req.url, `http://127.0.0.1:${PORT}`)
  const pathname = parsedUrl.pathname
  const query = Object.fromEntries(parsedUrl.searchParams)
  const apiBase = `${basePath}/api`

  // 收集请求体
  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', () => {
    let jsonBody = {}
    if (body) { try { jsonBody = JSON.parse(body) } catch {} }

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return }

    // 静态资源
    if (pathname.startsWith('/assets/')) {
      const filePath = path.join(__dirname, '..', 'frontend', 'dist', pathname)
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath)
        const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' })
        fs.createReadStream(filePath).pipe(res)
        return
      }
      res.writeHead(404); res.end('Not found'); return
    }

    // API 路由
    if (pathname.startsWith(apiBase + '/')) {
      const result = routeApi(method, pathname, query, jsonBody, req)
      if (result) {
        const status = result.status || 200
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(result.json || result))
        return
      }
      // CSV 模板/导出
      const csvResult = routeCsv(method, pathname, query, req)
      if (csvResult) {
        res.writeHead(200, csvResult.headers)
        res.end(csvResult.body)
        return
      }
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(fail('API endpoint not found')))
      return
    }

    // SPA fallback
    const indexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html')
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf-8')
      html = html.replace('</head>', `<script>window.__BASE_PATH__="${basePath}";</script></head>`)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
      return
    }
    res.writeHead(404); res.end('Frontend not built. Run: cd frontend && npm run build')
  })
})

function routeApi(method, pathname, query, body, req) {
  const apiBase = `${basePath}/api`

  // Auth
  if (method === 'POST' && pathname === `${apiBase}/login`) {
    const { username, password } = body
    if (username === 'admin' && password === adminPassword) {
      const token = `mock-token-${Date.now()}`
      validTokens.add(token)
      return { json: ok({ id: 1, username: 'admin', token }, '登录成功') }
    }
    return { status: 401, json: fail('用户名或密码错误') }
  }
  if (method === 'POST' && pathname === `${apiBase}/logout`) {
    const auth = req.headers['authorization']
    if (auth && auth.startsWith('Bearer ')) validTokens.delete(auth.slice(7))
    return { json: ok(null, '登出成功') }
  }
  if (method === 'PUT' && pathname === `${apiBase}/change-password`) {
    const { old_password, new_password } = body
    if (old_password !== adminPassword) return { status: 400, json: fail('原密码错误') }
    if (!new_password || new_password.length < 6) return { status: 400, json: fail('新密码至少6位') }
    adminPassword = new_password
    return { json: ok(null, '密码修改成功') }
  }

  // 认证检查
  const needAuth = !pathname.endsWith('/login') && !pathname.endsWith('/logout')
  if (needAuth && !authRequired(req)) return { status: 401, json: fail('未登录') }

  // Dashboard
  if (method === 'GET' && pathname === `${apiBase}/dashboard/stats`) return { json: ok({
    shop_count: shops.length, supplier_count: suppliers.length, product_count: products.length,
    order_count: orders.length, pending_order_count: orders.filter(o => o.status === 'pending').length,
    purchase_order_count: purchaseOrders.length, total_amount: orders.reduce((s, o) => s + o.amount, 0),
  })}
  if (method === 'GET' && pathname === `${apiBase}/dashboard/recent-orders`) return { json: ok(orders.filter(o => o.status === 'pending').slice(0, 5)) }

  // Shops
  if (method === 'GET' && pathname === `${apiBase}/shops`) {
    let list = shops
    if (query.keyword) list = list.filter(s => s.shop_name.includes(query.keyword) || s.shop_no.includes(query.keyword))
    if (query.status) list = list.filter(s => s.status === query.status)
    return { json: ok(paginate(list, +query.page || 1, +query.pageSize || 20)) }
  }
  if (method === 'GET' && pathname === `${apiBase}/shops/all`) return { json: ok(shops.filter(s => s.status === 'active')) }
  const shopMatch = pathname.match(new RegExp(`^${apiBase}/shops/(\\d+)$`))
  if (shopMatch) {
    const id = parseId(shopMatch[1])
    const shop = shops.find(s => s.id === id)
    if (!shop) return { status: 404, json: fail('抖店不存在') }
    if (method === 'GET') return { json: ok(shop) }
    if (method === 'PUT') { Object.assign(shop, body, { id }); return { json: ok(shop, '更新成功') } }
    if (method === 'DELETE') { shops.splice(shops.indexOf(shop), 1); return { json: ok(null, '删除成功') } }
  }
  if (method === 'POST' && pathname === `${apiBase}/shops`) {
    const shop = { id: genId(), created_at: new Date().toISOString(), status: 'active', ...body }
    shops.push(shop); return { json: ok(shop, '创建成功') }
  }

  // Suppliers
  if (method === 'GET' && pathname === `${apiBase}/suppliers`) {
    let list = suppliers
    if (query.keyword) list = list.filter(s => s.name.includes(query.keyword) || s.contact.includes(query.keyword))
    if (query.status) list = list.filter(s => s.status === query.status)
    return { json: ok(paginate(list, +query.page || 1, +query.pageSize || 20)) }
  }
  if (method === 'GET' && pathname === `${apiBase}/suppliers/all`) return { json: ok(suppliers.filter(s => s.status === 'active')) }
  const supMatch = pathname.match(new RegExp(`^${apiBase}/suppliers/(\\d+)$`))
  if (supMatch) {
    const id = parseId(supMatch[1])
    const s = suppliers.find(s => s.id === id)
    if (!s) return { status: 404, json: fail('供应商不存在') }
    if (method === 'GET') return { json: ok(s) }
    if (method === 'PUT') { Object.assign(s, body, { id }); return { json: ok(s, '更新成功') } }
    if (method === 'DELETE') { suppliers.splice(suppliers.indexOf(s), 1); return { json: ok(null, '删除成功') } }
  }
  if (method === 'POST' && pathname === `${apiBase}/suppliers`) {
    const s = { id: genId(), created_at: new Date().toISOString(), status: 'active', ...body }
    suppliers.push(s); return { json: ok(s, '创建成功') }
  }

  // Products
  if (method === 'GET' && pathname === `${apiBase}/products`) {
    let list = products
    if (query.keyword) list = list.filter(p => p.sku.includes(query.keyword) || p.name.includes(query.keyword))
    if (query.supplier_id) list = list.filter(p => p.supplier_id == query.supplier_id)
    if (query.status) list = list.filter(p => p.status === query.status)
    return { json: ok(paginate(list, +query.page || 1, +query.pageSize || 20)) }
  }
  const prodMatch = pathname.match(new RegExp(`^${apiBase}/products/(\\d+)$`))
  if (prodMatch) {
    const id = parseId(prodMatch[1])
    const p = products.find(p => p.id === id)
    if (!p) return { status: 404, json: fail('商品不存在') }
    if (method === 'GET') return { json: ok(p) }
    if (method === 'PUT') { Object.assign(p, body, { id }); return { json: ok(p, '更新成功') } }
    if (method === 'DELETE') { products.splice(products.indexOf(p), 1); return { json: ok(null, '删除成功') } }
  }
  if (method === 'POST' && pathname === `${apiBase}/products`) {
    const p = { id: genId(), created_at: new Date().toISOString(), status: 'active', ...body }
    const sup = suppliers.find(s => s.id === p.supplier_id)
    if (sup) p.supplier = sup
    products.push(p); return { json: ok(p, '创建成功') }
  }

  // Orders
  if (method === 'GET' && pathname === `${apiBase}/orders`) {
    let list = orders
    if (query.keyword) list = list.filter(o => o.order_no.includes(query.keyword) || o.product_name.includes(query.keyword) || o.receiver.includes(query.keyword))
    if (query.shop_id) list = list.filter(o => o.shop_id == query.shop_id)
    if (query.status) list = list.filter(o => o.status === query.status)
    return { json: ok(paginate(list, +query.page || 1, +query.pageSize || 20)) }
  }
  if (method === 'POST' && pathname === `${apiBase}/orders/match`) {
    let matched = 0
    orders.forEach(o => { if (o.status === 'pending') { const p = products.find(p => p.sku === o.product_sku); if (p) { o.status = 'matched'; matched++ } } })
    return { json: ok({ matched, total: orders.filter(o => o.status === 'matched').length }, `成功匹配 ${matched} 个订单`) }
  }
  const orderMatch = pathname.match(new RegExp(`^${apiBase}/orders/(\\d+)$`))
  if (orderMatch) {
    const id = parseId(orderMatch[1])
    const o = orders.find(o => o.id === id)
    if (!o) return { status: 404, json: fail('订单不存在') }
    if (method === 'GET') return { json: ok(o) }
    if (method === 'PUT') { Object.assign(o, body, { id }); return { json: ok(o, '更新成功') } }
    if (method === 'DELETE') { orders.splice(orders.indexOf(o), 1); return { json: ok(null, '删除成功') } }
  }
  if (method === 'POST' && pathname === `${apiBase}/orders`) {
    const o = { id: genId(), created_at: new Date().toISOString(), status: 'pending', ...body }
    orders.push(o); return { json: ok(o, '创建成功') }
  }

  // Purchase Orders
  if (method === 'GET' && pathname === `${apiBase}/purchase-orders`) {
    let list = purchaseOrders
    if (query.keyword) list = list.filter(p => p.po_no.includes(query.keyword))
    if (query.status) list = list.filter(p => p.status === query.status)
    return { json: ok(paginate(list, +query.page || 1, +query.pageSize || 20)) }
  }
  const poGenerate = pathname.match(new RegExp(`^${apiBase}/purchase-orders/generate/(\\d+)$`))
  if (poGenerate && method === 'POST') {
    const order = orders.find(o => o.id === parseId(poGenerate[1]))
    if (!order) return { status: 404, json: fail('订单不存在') }
    const product = products.find(p => p.sku === order.product_sku)
    if (!product) return { status: 404, json: fail('商品不存在') }
    const po = {
      id: genId(), po_no: `PO${Date.now()}`, order_id: order.id, supplier_id: product.supplier_id, product_id: product.id,
      quantity: order.quantity, purchase_price: product.cost_price, total_amount: product.cost_price * order.quantity,
      status: 'pending', tracking_number: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      supplier: suppliers.find(s => s.id === product.supplier_id), product, order,
    }
    purchaseOrders.push(po); order.status = 'purchased'
    return { json: ok(po, '采购单生成成功') }
  }
  const poStatusMatch = pathname.match(new RegExp(`^${apiBase}/purchase-orders/(\\d+)/status$`))
  if (poStatusMatch && method === 'PUT') {
    const po = purchaseOrders.find(p => p.id === parseId(poStatusMatch[1]))
    if (!po) return { status: 404, json: fail('采购单不存在') }
    po.status = body.status; po.updated_at = new Date().toISOString()
    if (body.tracking_number) po.tracking_number = body.tracking_number
    return { json: ok(po, '状态更新成功') }
  }
  const poMatch = pathname.match(new RegExp(`^${apiBase}/purchase-orders/(\\d+)$`))
  if (poMatch) {
    const id = parseId(poMatch[1])
    const p = purchaseOrders.find(p => p.id === id)
    if (!p) return { status: 404, json: fail('采购单不存在') }
    if (method === 'GET') return { json: ok(p) }
    if (method === 'PUT') { Object.assign(p, body, { id, updated_at: new Date().toISOString() }); return { json: ok(p, '更新成功') } }
  }

  // Tools
  if (method === 'POST' && pathname === `${apiBase}/tools/process-all`) {
    let matched = 0
    orders.forEach(o => { if (o.status === 'pending') { const p = products.find(p => p.sku === o.product_sku); if (p) { o.status = 'matched'; matched++ } } })
    return { json: ok({ success_count: matched, fail_count: 0 }, `处理完成，匹配 ${matched} 个订单`) }
  }
  if (method === 'POST' && pathname === `${apiBase}/tools/backup/create`) {
    return { json: ok({ filename: `backup_${Date.now()}.db`, size: 102400, created_at: new Date().toISOString() }, '备份创建成功') }
  }
  if (method === 'GET' && pathname === `${apiBase}/tools/backups`) {
    return { json: ok([
      { id: 1, filename: 'backup_20260901.db', size: 102400, created_at: '2026-09-01T10:00:00Z' },
      { id: 2, filename: 'backup_20260902.db', size: 102500, created_at: '2026-09-02T10:00:00Z' },
    ]) }
  }

  return null
}

function routeCsv(method, pathname, query, req) {
  const apiBase = `${basePath}/api`
  if (method !== 'GET') return null

  const csvMap = {
    [`${apiBase}/shops/template`]: { filename: 'shops_template.csv', header: '抖店名称,抖店编号,AppKey,AppSecret,状态,备注', rows: [['示例抖店', 'DY700123456', 'app_key', 'app_secret', 'active', '示例备注']] },
    [`${apiBase}/shops/export`]: { filename: 'shops.csv', header: '抖店名称,抖店编号,状态,备注', rows: shops.map(s => [s.shop_name, s.shop_no, s.status, s.remark]) },
    [`${apiBase}/suppliers/template`]: { filename: 'suppliers_template.csv', header: '供应商名称,联系人,电话,微信,地址,备注', rows: [['示例供应商', '张经理', '13800138000', 'wx_example', '浙江省义乌市', '示例备注']] },
    [`${apiBase}/suppliers/export`]: { filename: 'suppliers.csv', header: '供应商名称,联系人,电话,微信,地址,备注', rows: suppliers.map(s => [s.name, s.contact, s.phone, s.wechat, s.address, s.remark]) },
    [`${apiBase}/products/template`]: { filename: 'products_template.csv', header: '供应商ID,SKU,商品名称,规格,成本价,售价,库存,图片URL,备注', rows: [['1', 'SKU-001', '示例商品', '默认规格', '9.90', '19.90', '100', 'https://example.com/image.jpg', '示例备注']] },
    [`${apiBase}/products/export`]: { filename: 'products.csv', header: 'SKU,商品名称,规格,成本价,售价,库存,状态', rows: products.map(p => [p.sku, p.name, p.spec || '', p.cost_price, p.sale_price, p.stock, p.status]) },
    [`${apiBase}/orders/template`]: { filename: 'orders_template.csv', header: '订单编号,商品SKU,商品名称,数量,规格,金额,收件人,电话,地址,供应商ID,状态', rows: [['DD20260901001', 'SKU-001', '示例商品', '1', '默认规格', '9.90', '张三', '13800138000', '北京市朝阳区建国路88号', '1', 'pending']] },
    [`${apiBase}/orders/export`]: { filename: 'orders.csv', header: '订单编号,商品SKU,商品名称,数量,金额,收件人,电话,状态', rows: orders.map(o => [o.order_no, o.product_sku, o.product_name, o.quantity, o.amount, o.receiver, o.phone, o.status]) },
    [`${apiBase}/purchase-orders/export`]: { filename: 'purchase_orders.csv', header: '采购单号,供应商,商品,数量,采购价,总额,状态', rows: purchaseOrders.map(p => [p.po_no, p.supplier?.name || '', p.product?.name || '', p.quantity, p.purchase_price, p.total_amount, p.status]) },
  }

  const csv = csvMap[pathname]
  if (!csv) return null

  let body = '\ufeff' + csv.header + '\n'
  csv.rows.forEach(row => { body += row.join(',') + '\n' })
  return {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename=${csv.filename}` },
    body,
  }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log('')
  console.log('========================================')
  console.log('  DouDian 本地预览环境已启动')
  console.log('========================================')
  console.log('')
  console.log(`  访问地址: http://127.0.0.1:${PORT}/${SECRET_PATH}/login`)
  console.log(`  账号: admin`)
  console.log(`  密码: admin123`)
  console.log('')
  console.log(`  按 Ctrl+C 停止`)
  console.log('')
})
