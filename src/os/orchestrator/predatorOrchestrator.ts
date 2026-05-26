import { ModuleLoader } from '../modules/loader';
import { executeWorkflow, executePipeline, ExecContext } from '../../engine/runtime/orchestrator';
import * as complianceActions from '../../engine/actions/compliance';
import * as graphActions from '../../engine/actions/graph';
import * as remediationActions from '../../engine/actions/remediation';
import * as assetActions from '../../engine/actions/asset';
import * as riskActions from '../../engine/actions/risk';
import * as securityActions from '../../engine/actions/security';
import * as auditActions from '../../engine/actions/audit';
import * as vulnerabilityActions from '../../engine/actions/vulnerability';
import * as configActions from '../../engine/actions/config';
import { workflow_invoke_async } from '../../engine/runtime/async';

const ACTION_REGISTRY: any = {
  compliance: complianceActions,
  graph: graphActions,
  remediation: remediationActions,
  asset: assetActions,
  risk: riskActions,
  security: securityActions,
  audit: auditActions,
  vulnerability: vulnerabilityActions,
  config: configActions,
  workflow: {
    invoke_async: workflow_invoke_async
  }
};

export class PredatorOrchestrator {
  private module = ModuleLoader.loadDefaultPredator();

  async runWorkflow(name: string) {
    const workflow = this.module.workflows?.find(w => w.name === name);
    if (!workflow) throw new Error(`Workflow not found: ${name}`);

    const ctx: ExecContext = {
      actions: ACTION_REGISTRY,
      config: this.module.config
    };

    return await executeWorkflow(workflow, ctx);
  }

  async runPipeline(name: string) {
    const pipeline = this.module.pipelines?.find(p => p.name === name);
    if (!pipeline) throw new Error(`Pipeline not found: ${name}`);

    const ctx: ExecContext = {
      actions: ACTION_REGISTRY,
      config: this.module.config
    };

    return await executePipeline(pipeline, ctx);
  }
}
