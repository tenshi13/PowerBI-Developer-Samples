import json, sys
import requests
from functools import lru_cache
from services.embedtoken import EmbedToken
from services.embedconfig import EmbedConfig
from services.reportconfig import ReportConfig
from services.aadservice import AadService

class EthanTokenService:
    def get_request_header(self):
        '''Get Power BI API request header

        Returns:
            Dict: Request header
        '''

        return {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AadService.get_access_token()}


    def custom_get_client_token(self, username:str, workspace_id:str, report_ids:list):
        """Get client token from powerbi service given report id/ids and workspace id
        - get dataset ids for reports we need
        - create request body
        - send request to get token

        Args:
            username (str): just username
            workspace_id (str): also group id
            report_ids (list): list of reports that user has access to and we need
        """
        reports = self.get_reports(report_ids, workspace_id)
        dataset_ids = self.get_report_datasetid(report_ids, workspace_id)
        params = self.get_params(username, dataset_ids, report_ids)
        print("custom_get_client_token 1", file=sys.stderr)
        print(json.dumps(params, indent=4, sort_keys=True), file=sys.stderr)

        #generate_token_url = f'https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/reports/{report_id}/GenerateToken'
        generate_token_url = f'https://api.powerbi.com/v1.0/myorg/GenerateToken'
        api_response = requests.post(generate_token_url, data=json.dumps(params), headers=self.get_request_header())

        api_response = json.loads(api_response.text)
        print("custom_get_client_token 2", file=sys.stderr)
        print(json.dumps(api_response, indent=4, sort_keys=True), file=sys.stderr)

        embed_token = EmbedToken(api_response['tokenId'], api_response['token'], api_response['expiration'])
        embed_config = EmbedConfig(embed_token.tokenId, embed_token.token, embed_token.tokenExpiry, reports)

        return json.dumps(embed_config.__dict__)


    @lru_cache(maxsize=2)
    def get_reports_by_workspace(self, workspace_id: str):
        report_url = f'https://api.powerbi.com/v1.0/myorg/groups/{workspace_id}/reports'
        api_response = requests.get(report_url, headers=self.get_request_header())

        if api_response.status_code != 200: 
            raise('Error while retrieving embed URL')
            # abort(api_response.status_code, description=f'Error while retrieving Embed URL\n{api_response.reason}:\t{api_response.text}\nRequestId:\t{api_response.headers.get("RequestId")}')

        api_response = json.loads(api_response.text)
        print("get_reports_by_workspace", file=sys.stderr)
        print(json.dumps(api_response, indent=4, sort_keys=True), file=sys.stderr)

        reports = {}
        for report in api_response['value']:
            report_id = report['id']
            reports[report_id] = report

        return reports


    def get_report_datasetid(self, report_ids, workspace_id):
        all_reports = self.get_reports_by_workspace(workspace_id)

        dataset_ids = []
        for report_id in report_ids:
            dataset_ids.append(all_reports[report_id]['datasetId'])

        return dataset_ids


    def get_reports(self, report_ids, workspace_id):
        all_reports = self.get_reports_by_workspace(workspace_id)

        reports = {}
        for report_id in report_ids:
            reports[report_id] = all_reports[report_id]

        return reports


    def get_param_entries(self, ids):
        entries = []
        
        for id in ids:
            entries.append({'id': id})

        return entries


    def get_params(self, username, dataset_ids, reportIds):
        datasets = self.get_param_entries(dataset_ids)
        reports = self.get_param_entries(reportIds)

        params = {
            "datasets": datasets,
            "reports": reports,
            "identities": [
                {
                    "username": username,
                    "roles": ['developer'], # this can change dependings
                    "datasets": dataset_ids
                }
            ]
        }

        return params

