# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

from services.pbiembedservice import PbiEmbedService
from services.ethantokenservice import EthanTokenService
from utils import Utils
from flask import Flask, render_template, send_from_directory, request, jsonify
import json
import os
import sys

# Initialize the Flask app
app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True # so we dont need to stop/start server to refresh

# Load configuration
app.config.from_object('config.BaseConfig')

@app.route('/')
def index():
    '''Returns a static HTML page'''

    return render_template('index.html')


# EH: to run our test/demo pages
@app.route('/<testpage>')
def test(testpage):
    '''Returns a static HTML page'''
    print("here : " + testpage, file=sys.stderr)

    return render_template(f'{testpage}.html')
# EH: to run our test/demo pages


@app.route('/getembedinfo', methods=['GET'])
def get_embed_info():
    '''Returns report embed configuration'''

    config_result = Utils.check_config(app)
    if config_result is not None:
        return json.dumps({'errorMsg': config_result}), 500

    try:
        embed_info = PbiEmbedService().get_embed_params_for_single_report(app.config['WORKSPACE_ID'], app.config['REPORT_ID'])
        return embed_info
    except Exception as ex:
        return json.dumps({'errorMsg': str(ex)}), 500


@app.route('/fetch_token_ethan', methods=['POST'])
def get_token_ethan():
    print("In get_token_ethan", file=sys.stderr)

    '''Returns report embed configuration'''

    config_result = Utils.check_config(app)
    if config_result is not None:
        return json.dumps({'errorMsg': config_result}), 500

    try:
        data = request.json
        # return jsonify(data)
    
        embed_info = EthanTokenService().custom_get_client_token(data['username'], 
                                                                data['workspace_id'], 
                                                                data['report_ids'])
        print("get_token_ethan", file=sys.stderr)
        print(json.dumps(embed_info, indent=4, sort_keys=True), file=sys.stderr)

        return embed_info
        
    except Exception as ex:
        return json.dumps({'errorMsg': str(ex)}), 500


@app.route('/favicon.ico', methods=['GET'])
def getfavicon():
    '''Returns path of the favicon to be rendered'''

    return send_from_directory(os.path.join(app.root_path, 'static'), 'img/favicon.ico', mimetype='image/vnd.microsoft.icon')

if __name__ == '__main__':
    app.run(debug=True)