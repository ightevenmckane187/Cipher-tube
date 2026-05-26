export interface ActionDef {
  action: string;
  output?: string;
  params?: Record<string, any>;
  [key: string]: any;
}

export interface StepDef extends ActionDef {
  name: string;
  foreach?: string;
  parallel?: boolean | Record<string, any>;
}

export interface StageDef {
  name: string;
  from?: string | string[];
  use: string;
  emit?: string;
  parallel?: boolean | Record<string, any>;
  branches?: Record<string, StageDef>;
  where?: Record<string, any>;
}

export interface SourceDef {
  name: string;
  use: string;
}

export interface SinkDef {
  name: string;
  use: string;
  from?: string | string[];
}

export interface PipelineDef {
  name: string;
  schedule?: string;
  sources: SourceDef[];
  stages: StageDef[];
  sinks: SinkDef[];
}

export interface WorkflowDef {
  name: string;
  schedule?: string;
  params?: string[];
  steps: StepDef[];
}

export interface PredatorModule {
  module: string;
  version: string;
  config: Record<string, any>;
  pipelines?: PipelineDef[];
  workflows?: WorkflowDef[];
}
