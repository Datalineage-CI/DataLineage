﻿import * as React from "react";
import uuid = require("uuid/v4");
import { SeedInput } from "./seed-input";
import { LogOutput } from "./log-output";
import { ChannelPackagesList } from "./channel-packages-list";
import { IDataPackage } from "../../server/data-package";

const lightweight = "lightweight";
const standard = "standard";

export interface IProp {
    /**
     * The root address of the channel, which packages will be used to be selected as a input for current new package
     */
    inputsAddress: string[];
    inputsConfirmed?: boolean;
    seed?: string;
    onSeedConfirmed?(seed: string);
}


interface IField {
    key: string;
    value: string;
}

interface IFieldError {
    /**
     * The error of the key
     */
    key?: string;
    /**
     * the error of the value
     */
    value?: string;
}


class State {
    constructor(seed?: string) {
        if (seed) {
            this.seed = seed;
        }
    }

    seed: string | undefined;
    value: any = "";
    valueIsValid: boolean = true;
    otherFields: IField[] = [];
    otherFieldsError: IFieldError[] = [];
    ownerMetadata: any;
    packageType: "lightweight" | "standard" = lightweight;
    log: string[] = [];
    packageInputsAddress: string[] = [];
    isSubmitting: boolean = false;
}

export class Publisher extends React.Component<IProp, State> {
    private confirmeSeed(seed: string):void {
        this.setState({ seed: seed });
        if (this.props.onSeedConfirmed) {
            this.props.onSeedConfirmed(seed);
        }
    }

    constructor(props: any) {
        super(props);
        this.state = new State(props.seed);
    }

    private log(message: string):void {
        this.setState({ log: this.state.log.concat([message]) });
    }

    private validate(): boolean {
        let hasError = false;
        if (typeof (this.state.value) === "undefined" || this.state.value.trim() === "") {
            this.setState({ valueIsValid: false });
            hasError = true;
        }
        for (let i = 0; i < this.state.otherFields.length; i++) {
            const f = this.state.otherFields[i];
            this.state.otherFieldsError[i] = {
                key: f.key ? undefined : "missing",
                value: f.value ? undefined : "missing",
            }
            if (!f.key||!f.value) {
                hasError = true;
            }
        }
        return !hasError;
    }

    private async onAddClick(event: Event): Promise<void> {
        if (!this.validate()) {
            return;
        }
        const pkgId = uuid();
        this.log(`submitting package ${pkgId}`);
        this.setState({ isSubmitting: true });
        const newPkg = {
            inputs: this.state.packageInputsAddress,
            value: this.state.value,
            dataPackageId: pkgId
        };
        this.state.otherFields.forEach(f => newPkg[f.key] = f.value);
        if (this.state.ownerMetadata) {
            newPkg["ownerMetadata"] = this.state.ownerMetadata;
        }
        try {
            const pkg = await $.ajax(`/api/simulate/${this.state.packageType}/${this.state.seed}`,
                {
                    method: "POST",
                    data: JSON.stringify(newPkg),
                    contentType: "application/json",
                    dataType: "json"
                });
            if (pkg) {
                this.setState({ value: "", packageInputsAddress: [] });
                this.log(`package ${JSON.stringify(pkg)} is submitted.`);
            } else {
                this.log(`package submitte failed.`);
            }
        } catch (e) {
            this.log(`package submitte failed with error ${JSON.stringify(e)}.`);
        } 
        this.setState({ isSubmitting: false });
        event.preventDefault();
    }

    private onValueChange(changedField: string, event: React.ChangeEvent<HTMLInputElement>) {
        const changed = {};
        changed[changedField] = event.target.value;
        if (changedField === "value") {
            changed["valueIsValid"] = true;
        }
        this.setState(changed);
    }

    private onPackageTypeChanged(event: React.ChangeEvent<HTMLInputElement>) {
        this.setState({packageType: event.target.value as any});
    }

    private onPackageSelectedAsInput(pkg: IDataPackage, selected: boolean) {
        const index = this.state.packageInputsAddress.indexOf(pkg.mamAddress);
        if (selected) {
            if (index < 0) {
                this.setState({ packageInputsAddress: this.state.packageInputsAddress.concat([pkg.mamAddress]) });
            }
        } else {
            if (index >= 0) {
                this.setState({
                    packageInputsAddress: this.state.packageInputsAddress.filter(a => a !== pkg.mamAddress)
                });
            }
        }
    }

    private onAddFieldClick(event: React.ChangeEvent<HTMLButtonElement>) {
        this.setState({
            otherFields: this.state.otherFields.concat([{ key: "", value: "" }]),
            otherFieldsError: this.state.otherFieldsError.concat([{}])
        });
    }

    private onRemoveFieldClick(index:number, event: React.ChangeEvent<HTMLButtonElement>) {
        this.setState({
            otherFields: this.state.otherFields.filter((x, i) => i !== index),
            otherFieldsError: this.state.otherFieldsError.filter((x, i) => i !== index)
        });
    }

    private resetOtherFieldsError(index: number): IFieldError[] {
        return this.state.otherFieldsError.map((item, i) => {
            if (i !== index) {
                return item;
            }
            return {};
        });
    }

    private onOtherFieldChanged(fieldIndex: number, changedPart: "key" | "value", event: React.ChangeEvent<HTMLInputElement>) {
        this.setState({
            otherFields: this.state.otherFields.map((item, i) => {
                if (i !== fieldIndex) {
                    return item;
                }
                const newField = { ...item } as IField;
                newField[changedPart] = event.target.value;
                return newField;
            }),
            otherFieldsError: this.resetOtherFieldsError(fieldIndex)
        });
    }

    private renderOtherFields() {
        const isError = (p: "key" | "value", index: number): boolean => {
            if (this.state.otherFieldsError[index][p]) {
                return true;
            } else {
                return false;
            }
        };
        return <React.Fragment>
            <div className="form-row align-items-center">
                <div className="col-auto">
                    <label>Add more fields</label>
                </div>
                <div className="col-auto">
                    <button type="submit" className="btn btn-primary mb-2" onClick={this.onAddFieldClick.bind(this)}>Add Field</button>
                </div>
            </div>
            {this.state.otherFields.map((item, index) => <div className="form-group row" key={index}>
                <div className="col-sm-2">
                    <div className="input-group">
                        <div className="input-group-prepend">
                            <div className="input-group-text">Field</div>
                            <div className="input-group-text" onClick={this.onRemoveFieldClick.bind(this, index)}>
                                <i className="fas fa-trash-alt"></i>
                            </div>
                        </div>
                        <input value={item.key} onChange={this.onOtherFieldChanged.bind(this, index, "key")} type="text" className={`form-control ${isError("key", index) ? "is-invalid" : ""}`} placeholder="Input the new field name" />
                        <div className="invalid-feedback">Please input the field name.</div>
                    </div>
                </div>
                <div className="col-sm-10">
                    <div className="input-group">
                        <div className="input-group-prepend">
                            <div className="input-group-text">Value</div>
                        </div>
                        <input value={item.value} onChange={this.onOtherFieldChanged.bind(this, index, "value")} type="text" className={`form-control ${isError("value", index) ? "is-invalid" : ""}`} placeholder="Input the field value" />
                        <div className="invalid-feedback">Please input the field value.</div>
                    </div>
                </div>
            </div>)}
        </React.Fragment>;
    }

    private renderValueInput() {
        return <div className="row">
                   <div className="col-sm-12">
                       <div className="form-group row">
                           <label htmlFor="valueInput" className="col-sm-2 col-form-label">Value</label>
                           <div className="col-sm-10">
                               <div className="input-group">
                                   <div className="input-group-prepend">
                                       <div className="input-group-text"><i className="fas fa-code-branch"></i></div>
                                   </div>
                                   <input value={this.state.value} onChange={this.onValueChange.bind(this, "value")} type="text" className={`form-control ${this.state.valueIsValid ? "" : "is-invalid"}`} id="valueInput" placeholder="Input the new value" required />
                                   <div className="invalid-feedback">Please input the value.</div>
                               </div>
                           </div>
                       </div>
                       {this.renderOtherFields()}
                       <div className="form-group row">
                           <label htmlFor="valueInput" className="col-sm-2 col-form-label">Owner metadata</label>
                           <div className="col-sm-10">
                               <div className="input-group">
                                   <div className="input-group-prepend">
                                   <div className="input-group-text"><i className="fas fa-address-book"></i></div>
                                   </div>
                                   <input value={this.state.ownerMetadata} onChange={this.onValueChange.bind(this, "ownerMetadata")} type="text" className="form-control" placeholder="Owner information" />
                               </div>
                           </div>
                       </div>
                       <fieldset className="form-group">
                           <div className="row">
                               <legend className="col-form-label col-sm-2 pt-0">Protocol type</legend>
                               <div className="col-sm-10">
                                   <div className="form-check">
                                       <input onChange={this.onPackageTypeChanged.bind(this)} className="form-check-input" type="radio" name="packageType" id="packageTypeSimpleInput" value={lightweight} checked={this.state.packageType === lightweight}/>
                                       <label className="form-check-label" htmlFor="packageTypeSimpleInput">{`${lightweight} protocol`}</label>
                                   </div>
                                   <div className="form-check">
                                       <input onChange={this.onPackageTypeChanged.bind(this)} className="form-check-input" type="radio" name="packageType" id="packageTypeStandardInput" value={standard} checked={this.state.packageType === standard}/>
                                       <label className="form-check-label" htmlFor="packageTypeStandardInput">{`${standard} protocol`}</label>
                                   </div>
                               </div>
                           </div>
                       </fieldset>

                       <div className="form-group row">
                           <div className="col-sm-10">
                               <button type="button" className="btn btn-primary mb-2" onClick={this.onAddClick.bind(this)}>Add
                                   {this.state.isSubmitting && <i className="fas fa-sync-alt fa-spin" />}
                               </button>
                           </div>
                       </div>
                   </div>
               </div>;
    }

    private renderChannelPackages() {
        return <div className="row">
                   <div className="col-sm-12">
                       {this.props.inputsAddress &&
                           this.props.inputsAddress.map(a =>
                               <ChannelPackagesList key={a} rootAddress={a} selectedInputsAddress={this.state.packageInputsAddress} onPackageSelected={this.onPackageSelectedAsInput.bind(this)}/>)}
                   </div>
               </div>;
    }

    render() {
        return <React.Fragment>
                   <SeedInput seed={this.state.seed} onSeedConfirmed={this.confirmeSeed.bind(this)}/>
                   {(typeof (this.props.inputsConfirmed) === "undefined" || this.props.inputsConfirmed) &&
                       <React.Fragment>
                           {this.renderChannelPackages()}
                           {this.state.seed && this.renderValueInput()}
                           <div className="row">
                               <div className="col-sm-12">
                                   <LogOutput log={this.state.log}/>
                               </div>
                           </div>
                       </React.Fragment> }
               </React.Fragment>;
    }
}