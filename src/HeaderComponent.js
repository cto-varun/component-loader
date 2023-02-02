import React, { Component } from 'react';
import * as sqrl from 'squirrelly';

export default class HeaderComponent extends Component {
    get header() {
        try {
            let { header = '<div></div>' } = this.props;
            const { data = {} } = this.props;
            if (header === '' || header === '') {
                header = '<div></div>';
            }
            return sqrl.render(header, data || {});
        } catch (e) {
            return e.message;
        }
    }

    render() {
        const html = this.header;
        if (html === '' || html === '<div></div>' || html === '<div />') {
            return null;
        }
        return (
            <div
                className="header-component"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    }
}
