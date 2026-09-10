import React, { useState, useEffect } from 'react'
import { Table, Button, Space, Popconfirm, message, Upload } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ImportOutlined, ExportOutlined, UploadOutlined } from '@ant-design/icons'
import PageHeader from '../../components/PageHeader.jsx'
import SearchBar from '../../components/SearchBar.jsx'
import Pagination from '../../components/Pagination.jsx'
import ModalForm from '../../components/ModalForm.jsx'
import StatusTag from '../../components/StatusTag.jsx'
import { http } from '../../api/request.js'
import { formatDateTime } from '../../utils/format.js'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, SHOP_STATUS } from '../../utils/constants.js'

const ShopList = () => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [searchParams, setSearchParams] = useState({})

  const [modalVisible, setModalVisible] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [editingRecord, setEditingRecord] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  const searchFields = [
    { name: 'keyword', label: '关键词', type: 'input', placeholder: '店铺名称/编号' },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      options: [
        { value: 'active', label: '正常' },
        { value: 'inactive', label: '已停用' },
      ],
    },
  ]

  const formFields = [
    { name: 'shop_name', label: '店铺名称', type: 'input', required: true },
    { name: 'shop_no', label: '店铺编号', type: 'input', required: true },
    { name: 'app_key', label: 'App Key', type: 'input' },
    { name: 'app_secret', label: 'App Secret', type: 'input' },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      required: true,
      options: [
        { value: 'active', label: '正常' },
        { value: 'inactive', label: '已停用' },
      ],
    },
    { name: 'remark', label: '备注', type: 'textarea', rows: 3 },
  ]

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = { page, pageSize, ...searchParams }
      const result = await http.get('/shops', params)
      setData(result.items || [])
      setTotal(result.total || 0)
    } catch (error) {
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, pageSize, searchParams])

  const handleSearch = (values) => { setSearchParams(values); setPage(DEFAULT_PAGE) }
  const handleReset = () => { setSearchParams({}); setPage(DEFAULT_PAGE) }

  const handleAdd = () => {
    setModalTitle('新增抖店')
    setEditingRecord(null)
    setModalVisible(true)
  }

  const handleEdit = (record) => {
    setModalTitle('编辑抖店')
    setEditingRecord(record)
    setModalVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      await http.delete(`/shops/${id}`)
      message.success('删除成功')
      fetchData()
    } catch (error) { /* error handled by interceptor */ }
  }

  const handleModalOk = async (values) => {
    setModalLoading(true)
    try {
      if (editingRecord) {
        await http.put(`/shops/${editingRecord.id}`, values)
        message.success('更新成功')
      } else {
        await http.post('/shops', values)
        message.success('新增成功')
      }
      setModalVisible(false)
      fetchData()
    } catch (error) { /* error handled by interceptor */ } finally {
      setModalLoading(false)
    }
  }

  const handleImport = (file) => {
    const formData = new FormData()
    formData.append('file', file)
    http.post('/shops/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((res) => { message.success(`导入成功，共 ${res.count || 0} 条`); fetchData() })
      .catch(() => {})
    return false
  }

  const handleExport = () => {
    http.download('/shops/export', searchParams, `抖店列表_${Date.now()}.csv`)
      .then(() => message.success('导出成功'))
      .catch(() => {})
  }

  const handleDownloadTemplate = () => {
    http.download('/shops/template', {}, '抖店导入模板.csv')
      .then(() => {})
      .catch(() => {})
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '店铺名称', dataIndex: 'shop_name', key: 'shop_name' },
    { title: '店铺编号', dataIndex: 'shop_no', key: 'shop_no', width: 140 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (status) => <StatusTag status={status} type="shop" /> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 170, render: (val) => formatDateTime(val) },
    {
      title: '操作', key: 'action', width: 160, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定要删除这个店铺吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="车型管理"
        subtitle="管理您的车型"
        breadcrumbs={[{ title: '首页' }, { title: '车型管理' }]}
        extra={
          <Space>
            <Button icon={<UploadOutlined />} onClick={handleDownloadTemplate}>模板</Button>
            <Upload showUploadList={false} beforeUpload={handleImport} accept=".csv">
              <Button icon={<ImportOutlined />}>导入</Button>
            </Upload>
            <Button icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增抖店</Button>
          </Space>
        }
      />
      <SearchBar fields={searchFields} onSearch={handleSearch} onReset={handleReset} />
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} scroll={{ x: 800 }} />
      <Pagination current={page} pageSize={pageSize} total={total} onChange={(p, ps) => { setPage(p); setPageSize(ps) }} />
      <ModalForm visible={modalVisible} title={modalTitle} fields={formFields} initialValues={editingRecord || { status: 'active' }} onOk={handleModalOk} onCancel={() => setModalVisible(false)} confirmLoading={modalLoading} width={600} />
    </div>
  )
}

export default ShopList
