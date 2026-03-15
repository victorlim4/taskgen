import type { Config } from "../config.js";
import type { GeneratedTask } from "../ai.js";
interface Team {
    id: string;
    name: string;
    key: string;
}
export interface Member {
    id: string;
    name: string;
    email: string;
}
interface Issue {
    id: string;
    identifier: string;
    url: string;
    title: string;
}
export interface State {
    id: string;
    name: string;
    type: string;
    color: string;
}
export interface IssueDetail {
    id: string;
    identifier: string;
    title: string;
    teamId: string;
    stateId: string;
}
export default class Linear {
    private config;
    constructor(config: Config);
    private query;
    getTeams(): Promise<Team[]>;
    createIssue(task: GeneratedTask, priority: number, assigneeId: string, teamId: string, stateId: string): Promise<Issue>;
    getTeamMembers(teamId: string): Promise<Member[]>;
    getViewer(): Promise<Member>;
    getLinearTemplates(teamId: string): Promise<{
        id: string;
        name: string;
        description: string;
    }[]>;
    getTeamStates(teamId: string): Promise<State[]>;
    getIssueByIdentifier(identifier: string): Promise<IssueDetail>;
    updateIssueStatus(issueId: string, stateId: string): Promise<void>;
}
export {};
//# sourceMappingURL=linear.d.ts.map