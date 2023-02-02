import React from 'react';
import { Select } from 'antd';

export default function RangeFilter({
    onChange,
    properties: { rangeFilter = {} },
    values: { range },
}) {
    const now = Date.now();
    const msDay = 86400000;

    const optionsData = rangeFilter.dateRanges.map(data => {
        return (
            <Select.Option key={data.numberOfDays} value={data.numberOfDays}>
                {data.description}
            </Select.Option>
        );
    });

    const clickHandler = e => {
        const value = e;
        let start;
        let end;
        if (value === -1) {
            start = 0;
            end = now;
        } else {
            start = now - msDay * e;
            end = now;
        }
        onChange(start, end, value);
    };

    // Set Initial Value
    if (!range) {
        clickHandler(rangeFilter.defaultValue);
    }

    return (
        <div className="range-filter">
            <Select
                defaultValue={range}
                style={{ width: '100%' }}
                onChange={clickHandler}
            >
                {optionsData}
            </Select>
        </div>
    );
}
