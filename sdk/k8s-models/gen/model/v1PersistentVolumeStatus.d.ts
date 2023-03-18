/**
 * Kubernetes
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: release-1.25
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
/**
* PersistentVolumeStatus is the current status of a persistent volume.
*/
export declare class PersistentVolumeStatus {
    /**
    * message is a human-readable message indicating details about why the volume is in this state.
    */
    'message'?: string;
    /**
    * phase indicates if a volume is available, bound to a claim, or released by a claim. More info: https://kubernetes.io/docs/concepts/storage/persistent-volumes#phase
    */
    'phase'?: string;
    /**
    * reason is a brief CamelCase string that describes any failure and is meant for machine parsing and tidy display in the CLI.
    */
    'reason'?: string;
    static discriminator: string | undefined;
    static attributeTypeMap: Array<{
        name: string;
        baseName: string;
        type: string;
    }>;
    static getAttributeTypeMap(): {
        name: string;
        baseName: string;
        type: string;
    }[];
}
