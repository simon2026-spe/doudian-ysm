import React from 'react'
import { Form, Input, Select, Button, Space } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import './SearchBar.css'

const SearchBar = ({ fields = [], onSearch, onReset, extra, initialValues = {} }) => {
  const [form] = Form.useForm()

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const filteredValues = {}
    Object.keys(values).forEach((key) => {
      if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
        filteredValues[key] = values[key]
      }
    })
    onSearch && onSearch(filteredValues)
  }

  const handleReset = () => {
    form.resetFields()
    onReset && onReset()
  }

  const renderField = (field) => {
    const { name, label, type = 'input', options = [], placeholder, ...rest } = field

    const getPlaceholder = () => {
      if (placeholder) return placeholder
      switch (type) {
        case 'input':
          return `请输入${label}`
        case 'select':
          return `请选择${label}`
        default:
          return ''
      }
    }

    let component
    switch (type) {
      case 'input':
        component = <Input placeholder={getPlaceholder()} allowClear {...rest} />
        break
      case 'select':
        component = (
          <Select placeholder={getPlaceholder()} allowClear style={{ width: '100%' }} {...rest}>
            {options.map((opt) => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        )
        break
      default:
        component = <Input placeholder={getPlaceholder()} allowClear {...rest} />
    }

    return (
      <div key={name} className="searchbar-item">
        <label className="searchbar-label">{label}：</label>
        <Form.Item name={name} noStyle>
          {component}
        </Form.Item>
      </div>
    )
  }

  return (
    <Form
      form={form}
      initialValues={initialValues}
      className="searchbar-container"
    >
      <div className="searchbar-fields">
        {fields.map((field) => renderField(field))}
      </div>
      <div className="searchbar-actions">
        <Space>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          {extra}
        </Space>
      </div>
    </Form>
  )
}

export default SearchBar
