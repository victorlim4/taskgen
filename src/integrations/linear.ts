import type { Config } from "../config.js";
import type { GeneratedTask } from "../ai.js";

const LINEAR_API = "https://api.linear.app/graphql";

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
    constructor(private config: Config) {
        if (!config.linearApiKey) {
            throw new Error("Linear API key not configured");
        }
    }

    private async query(query: string, variables: Record<string, unknown>) {
        const response = await fetch(LINEAR_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.config.linearApiKey!,
            },
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) throw new Error(`Linear API error: ${response.statusText}`);
        const data = await response.json();
        if ((data as any).errors) throw new Error((data as any).errors[0].message);
        return (data as any).data;
    }

    async getTeams(): Promise<Team[]> {
        const data = await this.query(`query { teams { nodes { id name key } } }`, {});
        return data.teams.nodes;
    }

    async createIssue(
        task: GeneratedTask,
        priority: number,
        assigneeId: string,
        teamId: string,
        stateId: string
    ): Promise<Issue> {
        const data = await this.query(
            `mutation CreateIssue($title: String!, $description: String!, $teamId: String!, $priority: Int, $assigneeId: String, $stateId: String!) {
        issueCreate(input: {
          title: $title
          description: $description
          teamId: $teamId
          priority: $priority
          assigneeId: $assigneeId
          stateId: $stateId
        }) {
          success
          issue { id identifier url title }
        }
      }`,
            {
                title: task.title,
                description: task.description,
                teamId,
                priority: priority,
                assigneeId,
                stateId,
            }
        );

        return data.issueCreate.issue;
    }

    async getTeamMembers(teamId: string): Promise<Member[]> {
        const data = await this.query(
            `query($teamId: String!) {
        team(id: $teamId) {
          members { nodes { id name email } }
        }
      }`,
            { teamId }
        );
        return data.team.members.nodes;
    }

    async getViewer(): Promise<Member> {
        const data = await this.query(`query { viewer { id name email } }`, {});
        return data.viewer;
    }

    async getLinearTemplates(
        teamId: string
    ): Promise<{ id: string; name: string; description: string }[]> {
        const data = await this.query(
            `query($teamId: String!) {
        team(id: $teamId) {
          templates { nodes { id name description } }
        }
      }`,
            { teamId }
        );
        return data.team.templates.nodes;
    }

    async getTeamStates(teamId: string): Promise<State[]> {
        const data = await this.query(
            `query($teamId: String!) {
        team(id: $teamId) {
          states { nodes { id name type color } }
        }
      }`,
            { teamId }
        );
        return data.team.states.nodes;
    }

    async getIssueByIdentifier(identifier: string): Promise<IssueDetail> {
        const data = await this.query(
            `query($identifier: String!) {
          issue(id: $identifier) {
            id identifier title
            team { id }
            state { id }
          }
        }`,
            { identifier }
        );

        return {
            id: data.issue.id,
            identifier: data.issue.identifier,
            title: data.issue.title,
            teamId: data.issue.team.id,
            stateId: data.issue.state.id,
        };
    }

    async updateIssueStatus(issueId: string, stateId: string): Promise<void> {
        await this.query(
            `mutation UpdateIssue($issueId: String!, $stateId: String!) {
          issueUpdate(id: $issueId, input: { stateId: $stateId }) {
            success
          }
        }`,
            { issueId, stateId }
        );
    }
}
