export interface BuildOptions {
    componentCode: string;
    outputDir: string;
    pageId: string;
}
export declare class BuildService {
    private buildDir;
    constructor();
    buildComponent(options: BuildOptions): Promise<string>;
    private generateEntryContent;
    private generateWebpackConfig;
    private cleanup;
}
//# sourceMappingURL=buildService.d.ts.map