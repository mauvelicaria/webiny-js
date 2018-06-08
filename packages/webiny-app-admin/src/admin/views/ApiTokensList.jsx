import React, { Fragment } from "react";

import _ from "lodash";
import { i18n, createComponent } from "webiny-app";

const t = i18n.namespace("Security.ApiTokensList");

class ApiTokensList extends React.Component {
    constructor(props) {
        super(props);
        this.renderFullNameField = this.renderFullNameField.bind(this);
    }

    renderFullNameField(row) {
        let fullName = _.trim(`${row.data.firstName} ${row.data.lastName}`);
        fullName = _.isEmpty(fullName) ? row.data.email : fullName;
        return (
            <span>
                <strong>{fullName}</strong>
                <br />
                {row.data.id}
            </span>
        );
    }

    render() {
        const { View, List, ListData, Link, Icon, Input, AdminLayout, Loader } = this.props.modules;
        const Table = List.Table;

        return (
            <AdminLayout>
                <View.List>
                    <View.Header title={t`Security - API Tokens`}>
                        <Link type="primary" route="ApiTokens.Create" align="right">
                            <Icon icon="plus-circle" />
                            {t`Create API Token`}
                        </Link>
                    </View.Header>
                    <View.Body>
                        <ListData
                            withRouter
                            entity="SecurityApiToken"
                            fields="id enabled name createdOn"
                        >
                            {({ loading, ...listProps }) => (
                                <Fragment>
                                    {loading && <Loader />}
                                    <List {...listProps}>
                                        <Table>
                                            <Table.Row>
                                                <Table.Field
                                                    name="name"
                                                    label={t`Name`}
                                                    sort="name"
                                                />
                                                <Table.ToggleField
                                                    name="enabled"
                                                    label={t`Status`}
                                                    sort="enabled"
                                                    align="center"
                                                    message={({ value }) => {
                                                        if (value) {
                                                            return null;
                                                        }
                                                        return t`This will disable API token's access.`;
                                                    }}
                                                />
                                                <Table.DateField
                                                    name="createdOn"
                                                    label={t`Created On`}
                                                    sort="createdOn"
                                                />
                                                <Table.Actions>
                                                    <Table.EditAction route="ApiTokens.Edit" />
                                                    <Table.DeleteAction />
                                                </Table.Actions>
                                            </Table.Row>
                                            <Table.Footer />
                                        </Table>
                                        <List.Pagination />
                                    </List>
                                </Fragment>
                            )}
                        </ListData>
                    </View.Body>
                </View.List>
            </AdminLayout>
        );
    }
}

export default createComponent(ApiTokensList, {
    modules: [
        { AdminLayout: "Admin.Layout" },
        "View",
        "List",
        "ListData",
        "Link",
        "Icon",
        "Loader",
        "Input"
    ]
});
