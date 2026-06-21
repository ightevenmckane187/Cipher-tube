export declare const logger: any;
export interface WizardReport {
    score: number;
    dimensions: {
        security: number;
        performance: number;
        ux: number;
        governance: number;
        mergeHealth: number;
    };
    findings: Finding[];
}
export interface Finding {
    id: string;
    pillar: 'security' | 'performance' | 'ux' | 'governance' | 'merge';
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    file?: string;
    line?: number;
    autoFixable: boolean;
    fix?: () => Promise<void>;
}
export declare class WizardEngine {
    private git;
    private resolver;
    constructor();
    analyze(): Promise<WizardReport>;
    repair(report: WizardReport): Promise<void>;
}
