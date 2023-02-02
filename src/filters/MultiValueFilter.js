import React, { Component } from 'react';
import { Select } from 'antd';
import '../styles.css';

const { Option, OptGroup } = Select;

export default class MultiValueFilter extends Component {
    render() {
        const {
            onChange,
            values: { selected },
            options: { items = [] },
            properties: {
                multiValueFilter: { fieldsToFilter },
            },
        } = this.props;

        const fieldData = field => {
            const dataOptions = [];
            items.forEach((item, index) => {
                if (item.field === field) {
                    dataOptions.push(<Option key={index}>{item.value}</Option>);
                }
            });

            return dataOptions;
        };

        const fields = fieldsToFilter.map(item => {
            return (
                <OptGroup key={item.fieldAlias}>
                    {fieldData(item.fieldName)}
                </OptGroup>
            );
        });

        const onMVChange = e => {
            onChange(e, items);
        };

        const handleFilterOption = (name, option) => {
            if (option.type === OptGroup) {
                return false;
            }
            const currName = items[option.key].value.toLocaleLowerCase();
            return currName.includes(name.toLocaleLowerCase());
        };

        // handle values outside of array index when chaining
        const values = selected.filter(item => items[item] !== undefined);

        return (
            <div className="multi-value-filter">
                <Select
                    style={{ width: '100%' }}
                    value={values}
                    placeholder="Please select"
                    allowClear
                    mode="multiple"
                    onChange={onMVChange}
                    filterOption={handleFilterOption}
                >
                    {fields}
                </Select>
            </div>
        );
    }
}
