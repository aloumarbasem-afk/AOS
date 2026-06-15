/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StackDetails {
  name: string;
  version: string;
  reason: string;
  advantages: string[];
}

export interface DatabaseDetails extends StackDetails {
  schemaPhilosophy: string;
}

export interface DecisionMatrix {
  frontend: StackDetails;
  backend: StackDetails;
  database: DatabaseDetails;
  infraAndCaching: {
    hosting: string;
    cacheOrQueue?: string;
    reason: string;
  };
}

export interface FileTreeNode {
  path: string;
  type: "file" | "directory";
  shortLabel?: string;
}

export interface ExecutionPhase {
  title: string;
  description: string;
  steps: string[];
  commandToRun?: string;
}

export interface AgentBlueprint {
  agentName: string;
  setupPrerequisites: string[];
  phases: ExecutionPhase[];
  agentSpecificTips: string[];
}

export interface FrontendOptimizationGuide {
  stylingLibrary: string;
  performanceTricks: string[];
  modularPatterns: string[];
}

export interface TestingSuiteStrategy {
  testingFramework: string;
  command: string;
  configBoilerplatePath: string;
  configBoilerplate: string;
  sampleTestPath: string;
  sampleTestCode: string;
}

export interface CicdStage {
  name: string;
  description: string;
  commandsOrActions: string[];
}

export interface CicdPipelineStrategy {
  toolName: string;
  reason: string;
  configFileTemplatePath: string;
  configFileContent: string;
  stages: CicdStage[];
}

export interface AuthStrategy {
  method: string;
  passwordManagement: string;
  rbac: string;
  boilerplatePath: string;
  boilerplateCode: string;
}

export interface ArchitecturalPlanResponse {
  projectName: string;
  oneLiner: string;
  scope: string[];
  stack: DecisionMatrix;
  tree: FileTreeNode[];
  boilerplates: Record<string, string>;
  agentPlan: AgentBlueprint;
  frontendGuide: FrontendOptimizationGuide;
  testingStrategy: TestingSuiteStrategy;
  cicdStrategy: CicdPipelineStrategy;
  authStrategy: AuthStrategy;
}
