﻿export interface IDataPackage {
    /*
     * A number representing the milliseconds elapsed since the UNIX epoch in Utc
     */
    timestamp: number;
    dataPackageId: string;
    /*
     * iota address of the package
     */
    iotaAddress: string;
    /*
     * The address of MAM for each input of the data package
     */
    inputs: string[];
}

export interface ILightweightPackage extends IDataPackage {
    data: any;
}

export interface IStandardPackage extends IDataPackage {
    signature: string;
}