import React from "react";
import { Admin } from "@webiny/app-serverless-cms";
import { Cognito } from "@webiny/app-admin-users-cognito";
import { HeadlessCms } from "@webiny/app-page-builder/translations/HeadlessCms";
import "./App.scss";

export const App = () => {
    return (
        <Admin>
            <Cognito />
            <HeadlessCms />
        </Admin>
    );
};
