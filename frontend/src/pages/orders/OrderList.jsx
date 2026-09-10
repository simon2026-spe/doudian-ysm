import React, { useState, useEffect } from 'react'
import { Table, Button, Space, message, Upload } from 'antd'
import { ImportOutlined, ExportOutlined, SyncOutlined, UploadOutlined } from '@ant-design/icons'
import PageHeader from '../../components/PageHeader.jsx'
import SearchBar from '../../components/SearchBar.jsx'
import Pagination from '../../components/Pagination.jsx'
import StatusTag from '../../components/StatusTag.jsx'
import { http } from '../../api/request.js'
import { formatDateTime, formatMoney, truncateText } from '../../utils/format.js'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, ORDER_STATUS } from '../../utils/constants.js'

const OrderList = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [searchParams, setSearchParams] = useState({})
  const [shops, setShops] = useState([])

  const fetchShops = async () => {
    try {
      const result = await http.get('/shops/all')
      setShops(result.map((s) => ({ value: s.id, label: s.shop_name })))
    } catch (error) {
      setShops([])
    }
  }

  const searchFields = [
    { name: 'keyword', label: '关键词', type: 'input', placeholder: '订单号/商品名/收件人' },
    { name: 'shop_id', label: '抖店', type: 'select', options: shops },
    {
      name: 'status', label: '状态', type: 'select',
      options: [
        { value: 'pending', label: '待处理' },
        { value: 'matched', label: '已匹配' },
        { value: 'purchased', label: '已采购' },
        { value: 'shipped', label: '已发货' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' },
      ],
    },
  ]

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = { page, pageSize, ...searchParams }
      const result = await http.get('/orders', params)
      setData(result.items || [])
      setTotal(result.total || 0)
    } catch (error) {
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchShops() }, [])
  useEffect(() => { fetchData() }, [page, pageSize, searchParams])

  const handleSearch = (values) => { setSearchParams(values); setPage(DEFAULT_PAGE) }
  const handleReset = () => { setSearchParams({}); setPage(DEFAULT_PAGE) }

  const handleExport = () => {
    http.download('/orders/export', searchParams, `订单列表_${Date.now()}.csv`)
      .then(() => message.success('导出成功')).catch(() => {})
  }

  const handleImport = (file) => {
    const formData = new FormData()
    formData.append('file', file)
    http.post('/orders/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => { message.success(`导入成功，共 ${res.count || 0} 条`); fetchData() })
      .catch(() => {})
    return false
  }

  const handleMatch = () => {
    message.loading({ content: '正在匹配订单...', key: 'match' })
    http.post('/orders/match')
      .then((res) => {
        message.success({ content: `匹配完成，成功 ${res.success_count || 0} 个，失败 ${res.fail_count || 0} 个`, key: 'match' })
        fetchData()
      })
      .catch(() => {})
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
    { title: '订单号', dataIndex: 'order_no', key: 'order_no', width: 160 },
    { title: '商品名称', dataIndex: 'product_name', key: 'product_name', width: 200, ellipsis: true },
    { title: '规格', dataIndex: 'spec', key: 'spec', width: 100 },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 70 },
    { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, render: (val) => formatMoney(val) },
    { title: '收件人', dataIndex: 'receiver', key: 'receiver', width: 90 },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 120 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (status) => <StatusTag status={status} type="order" /> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 170, render: (val) => formatDateTime(val) },
  ]

  return (
    <div>
      <PageHeader
        title="订单管理"
        subtitle="管理所有订单"
        breadcrumbs={[{ title: '首页' }, { title: '订单管理' }]}
        extra={
          <Space>
            <Button icon={<UploadOutlined />} onClick={() => http.download('/orders/template', {}, '订单导入模板.csv').catch(() => {})}>模板</Button>
            <Upload showUploadList={false} beforeUpload={handleImport} accept=".csv">
              <Button icon={<ImportOutlined />}>导入</Button>
            </Upload>
            <Button icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
            <Button type="primary" ghost icon={<SyncOutlined />} onClick={handleMatch}>一键匹配</Button>
          </Space>
        }
      />
      <SearchBar fields={searchFields} onSearch={handleSearch} onReset={handleReset} />
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} scroll={{ x: 1300 }} />
      <Pagination current={page} pageSize={pageSize} total={total} onChange={(p, ps) => { setPage(p); setPageSize(ps) }} />
    </div>
  )
}

export default OrderList
