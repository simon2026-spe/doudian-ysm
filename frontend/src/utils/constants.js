// 订单状态
export const ORDER_STATUS = {
  PENDING: 'pending',         // 待处理
  MATCHED: 'matched',         // 已匹配
  PURCHASED: 'purchased',     // 已采购
  SHIPPED: 'shipped',         // 已发货
  COMPLETED: 'completed',     // 已完成
  CANCELLED: 'cancelled',     // 已取消
}

// 订单状态文本
export const ORDER_STATUS_TEXT = {
  [ORDER_STATUS.PENDING]: '待处理',
  [ORDER_STATUS.MATCHED]: '已匹配',
  [ORDER_STATUS.PURCHASED]: '已采购',
  [ORDER_STATUS.SHIPPED]: '已发货',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.CANCELLED]: '已取消',
}

// 订单状态颜色
export const ORDER_STATUS_COLOR = {
  [ORDER_STATUS.PENDING]: 'orange',      // 待处理=橙色
  [ORDER_STATUS.MATCHED]: 'blue',        // 已匹配=蓝色
  [ORDER_STATUS.PURCHASED]: 'purple',    // 已采购=紫色
  [ORDER_STATUS.SHIPPED]: 'cyan',        // 已发货=青色
  [ORDER_STATUS.COMPLETED]: 'green',     // 已完成=绿色
  [ORDER_STATUS.CANCELLED]: 'red',       // 已取消=红色
}

// 采购单状态
export const PURCHASE_STATUS = {
  PENDING: 'pending',           // 待采购
  ORDERED: 'ordered',           // 已下单
  SHIPPED: 'shipped',           // 已发货
  RECEIVED: 'received',         // 已收货
  COMPLETED: 'completed',       // 已完成
  CANCELLED: 'cancelled',       // 已取消
}

// 采购单状态文本
export const PURCHASE_STATUS_TEXT = {
  [PURCHASE_STATUS.PENDING]: '待采购',
  [PURCHASE_STATUS.ORDERED]: '已下单',
  [PURCHASE_STATUS.SHIPPED]: '已发货',
  [PURCHASE_STATUS.RECEIVED]: '已收货',
  [PURCHASE_STATUS.COMPLETED]: '已完成',
  [PURCHASE_STATUS.CANCELLED]: '已取消',
}

// 采购单状态颜色
export const PURCHASE_STATUS_COLOR = {
  [PURCHASE_STATUS.PENDING]: 'orange',
  [PURCHASE_STATUS.ORDERED]: 'blue',
  [PURCHASE_STATUS.SHIPPED]: 'cyan',
  [PURCHASE_STATUS.RECEIVED]: 'purple',
  [PURCHASE_STATUS.COMPLETED]: 'green',
  [PURCHASE_STATUS.CANCELLED]: 'red',
}

// 商品状态
export const PRODUCT_STATUS = {
  ACTIVE: 'active',       // 在售
  INACTIVE: 'inactive',   // 下架
}

export const PRODUCT_STATUS_TEXT = {
  [PRODUCT_STATUS.ACTIVE]: '在售',
  [PRODUCT_STATUS.INACTIVE]: '下架',
}

export const PRODUCT_STATUS_COLOR = {
  [PRODUCT_STATUS.ACTIVE]: 'green',
  [PRODUCT_STATUS.INACTIVE]: 'default',
}

// 供应商状态
export const SUPPLIER_STATUS = {
  ACTIVE: 'active',       // 合作中
  INACTIVE: 'inactive',   // 已停用
}

export const SUPPLIER_STATUS_TEXT = {
  [SUPPLIER_STATUS.ACTIVE]: '合作中',
  [SUPPLIER_STATUS.INACTIVE]: '已停用',
}

export const SUPPLIER_STATUS_COLOR = {
  [SUPPLIER_STATUS.ACTIVE]: 'green',
  [SUPPLIER_STATUS.INACTIVE]: 'default',
}

// 抖店状态
export const SHOP_STATUS = {
  ACTIVE: 'active',       // 正常
  INACTIVE: 'inactive',   // 已停用
}

export const SHOP_STATUS_TEXT = {
  [SHOP_STATUS.ACTIVE]: '正常',
  [SHOP_STATUS.INACTIVE]: '已停用',
}

export const SHOP_STATUS_COLOR = {
  [SHOP_STATUS.ACTIVE]: 'green',
  [SHOP_STATUS.INACTIVE]: 'default',
}

// 分页默认值
export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100']

// 侧边栏菜单配置
export const MENU_ITEMS = [
  {
    key: '/dashboard',
    icon: 'DashboardOutlined',
    label: '仪表盘',
  },
  {
    key: '/orders',
    icon: 'OrderedListOutlined',
    label: '订单管理',
  },
  {
    key: '/purchase-orders',
    icon: 'ShoppingCartOutlined',
    label: '采购单管理',
  },
  {
    key: '/products',
    icon: 'ShoppingOutlined',
    label: '商品管理',
  },
  {
    key: '/suppliers',
    icon: 'TeamOutlined',
    label: '供应商管理',
  },
  {
    key: '/shops',
    icon: 'ShopOutlined',
    label: '抖店管理',
  },
  {
    key: '/tools',
    icon: 'ToolOutlined',
    label: '工具箱',
  },
]
