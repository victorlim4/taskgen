const LINEAR_API = "https://api.linear.app/graphql";
export default class Linear {
    config;
    constructor(config) {
        this.config = config;
        if (!config.linearApiKey) {
            throw new Error("Linear API key not configured");
        }
    }
    async query(query, variables) {
        const response = await fetch(LINEAR_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.config.linearApiKey,
            },
            body: JSON.stringify({ query, variables }),
        });
        if (!response.ok)
            throw new Error(`Linear API error: ${response.statusText}`);
        const data = await response.json();
        if (data.errors)
            throw new Error(data.errors[0].message);
        return data.data;
    }
    async getTeams() {
        const data = await this.query(`query { teams { nodes { id name key } } }`, {});
        return data.teams.nodes;
    }
    async createIssue(task, priority, assigneeId, teamId, stateId) {
        const data = await this.query(`mutation CreateIssue($title: String!, $description: String!, $teamId: String!, $priority: Int, $assigneeId: String, $stateId: String!) {
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
      }`, {
            title: task.title,
            description: task.description,
            teamId,
            priority: priority,
            assigneeId,
            stateId,
        });
        return data.issueCreate.issue;
    }
    async getTeamMembers(teamId) {
        const data = await this.query(`query($teamId: String!) {
        team(id: $teamId) {
          members { nodes { id name email } }
        }
      }`, { teamId });
        return data.team.members.nodes;
    }
    async getViewer() {
        const data = await this.query(`query { viewer { id name email } }`, {});
        return data.viewer;
    }
    async getLinearTemplates(teamId) {
        const data = await this.query(`query($teamId: String!) {
        team(id: $teamId) {
          templates { nodes { id name description } }
        }
      }`, { teamId });
        return data.team.templates.nodes;
    }
    async getTeamStates(teamId) {
        const data = await this.query(`query($teamId: String!) {
        team(id: $teamId) {
          states { nodes { id name type color } }
        }
      }`, { teamId });
        return data.team.states.nodes;
    }
    async getIssueByIdentifier(identifier) {
        const data = await this.query(`query($identifier: String!) {
          issue(id: $identifier) {
            id identifier title
            team { id }
            state { id }
          }
        }`, { identifier });
        return {
            id: data.issue.id,
            identifier: data.issue.identifier,
            title: data.issue.title,
            teamId: data.issue.team.id,
            stateId: data.issue.state.id,
        };
    }
    async updateIssueStatus(issueId, stateId) {
        await this.query(`mutation UpdateIssue($issueId: String!, $stateId: String!) {
          issueUpdate(id: $issueId, input: { stateId: $stateId }) {
            success
          }
        }`, { issueId, stateId });
    }
}
