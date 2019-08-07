import * as vscode from 'vscode';
import * as ips_constants from '../src/constants.json';
import * as ips_functions from '../src/functions.json';
import * as ips_moduleFunctions from '../src/moduleFunctions.json';

export function activate(context: vscode.ExtensionContext) {

	let inString = function(document: vscode.TextDocument, position: vscode.Position) {

		let textUntilPosition = document.getText(new vscode.Range(0, 0, position.line, position.character));
		
		// Remove completed strings
		textUntilPosition = textUntilPosition.replace(/"(?:[^"\\]|\\.)*"/g, '');
		textUntilPosition = textUntilPosition.replace(/'(?:[^'\\]|\\.)*'/g, '');
		if (textUntilPosition.indexOf('"') !== -1) {
		 return true;
		}
		if (textUntilPosition.indexOf("'") !== -1) {
		 return true;
		}

		return false;

	}

	let typeToString = function(type: number) {

		let types = [
			'boolean',
			'integer',
			'float',
			'string',
			'variant',
			'array'
		];

		return types[type];

	}

	let buildCompletionItems = function(document: vscode.TextDocument, position: vscode.Position, functions: any) {

		let completion: vscode.CompletionItem[] = [];

		for(let func of functions) {
			const c = new vscode.CompletionItem(func.FunctionName, vscode.CompletionItemKind.Function);
			c.detail = typeToString(func.Result.Type_);
			completion.push(c);
		}

		return completion;

	}	

	let buildSignatureHelp = function(document: vscode.TextDocument, position: vscode.Position, functions: any) {

		let textUntilPosition = document.getText(new vscode.Range(0, 0, position.line, position.character));
		
		// Remove completed strings
		textUntilPosition = textUntilPosition.replace(/"(?:[^"\\]|\\.)*"/g, '');
		textUntilPosition = textUntilPosition.replace(/'(?:[^'\\]|\\.)*'/g, '');

		// Remove an eventually started string
		textUntilPosition = textUntilPosition.replace(/'.*$/, '');
		textUntilPosition = textUntilPosition.replace(/".*$/, '');

		// Remove all pairs of brackets
		let bracketPattern = /\([^\(\)]*\)/g;
		while (bracketPattern.test(textUntilPosition)) {
			textUntilPosition = textUntilPosition.replace(bracketPattern, '');
		}

		let parameter = -1;
		let functionCapture = /[\s\(\?\,]([a-zA-Z_ -ÿ][a-zA-Z0-9_ -ÿ]*)\s*\([^\(]*$/.exec(textUntilPosition);
		if (!functionCapture || functionCapture.length < 2) {
			return null;
		}

		parameter = functionCapture[0].split('(')[1].split(',').length - 1;

		for (let func of functions) {
			if (func.FunctionName === functionCapture[1]) {
				let label = typeToString(func.Result.Type_) + " " + func.FunctionName + "(";
				for (let argument of func.Parameters) {
					if (argument !== func.Parameters[0]) {
						label += ', ';
					}
					label += typeToString(argument.Type_) + " " + argument.Description;
				}
				label += ')';

				let parameters = [];
				for (let argument of func.Parameters) {
					parameters.push({
						label: typeToString(argument.Type_) + " " + argument.Description,
						documentation: ''
					})
				}

				return {
					activeParameter: parameter,
					activeSignature: 0,
					signatures: [
						{
							label: label,
							parameters: parameters
						}
					]
				}
			}
		}

		return null;

	}

	let globalsCompletionItemsProvider = vscode.languages.registerCompletionItemProvider('php', {

		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

			if(inString(document, position)) {
				return [];
			}

			let completion: vscode.CompletionItem[] = [];

			let globals = [
				['$_IPS[\'SELF\']', 'ScriptID of the current script', 'integer'],
				['$_IPS[\'SENDER\']', 'Trigger of the current script', 'string'],
				['$_IPS[\'VALUE\']', 'Value of the current trigger, depending on the trigger (Only available for the triggers HeatingControl, RegisterVariable, Variable, Watchdog, and WebFront)', 'variant'],
				['$_IPS[\'OLDVALUE\']', 'Value of the affected variable before switching (Only available for the trigger Variable)', 'integer'],
				['$_IPS[\'VARIABLE\']', 'ID of the affected variable (Only available for the triggers Variable, Watchdog, and WebFront)', 'integer'],
				['$_IPS[\'EVENT\']', 'ID of the event (Only available for the triggers TimerEvent and Variable)', 'integer'],
				['$_IPS[\'TRIGGER\']', 'Type of the trigger event (Only available for the trigger Variable)', 'integer'],
				['$_IPS[\'TARGET\']', 'ID of the parent object (Only available for the triggers TimerEvent and Variable)', 'integer'],
				['$_IPS[\'ACTION\']', 'ID of the calling action (Only schedule event and only for the trigger TimerEvent)', 'integer'],
				['$_IPS[\'INSTANCE\']', 'ID of the relevant instance, depending on the trigger (Only available for the triggers RegisterVariable, ShutterControl, StatusEvent, and WebInterface)', 'integer'],
				['$_IPS[\'THREAD\']', 'ThreadID of the current script', 'integer'],
				['$_IPS[\'FORM\']', 'FormID of the formular from which the execution was called (Only available for the trigger Designer)', 'integer'],
				['$_IPS[\'COMPONENT\']', 'Content of the field IPSYMID (Only available for the trigger Designer)', 'string'],
				['$_IPS[\'DIRECTION\']', 'Moving direction: 0 = Stop, 1 = Up, 2 = Down (Only available for the trigger ShutterControl)', 'integer'],
				['$_IPS[\'DURATION\']', 'Moving duration in milliseconds (Only available for the trigger ShutterControl)', 'integer'],
				['$_IPS[\'STATUS\']', 'Status of the instance (Only available for the trigger StatusEvent)', 'integer'],
				['$_IPS[\'STATUSTEXT\']', 'A text describing the new state (Only available for the trigger StatusEvent and Watchdog)', 'string'],
				['$_IPS[\'CONFIGURATOR\']', 'ID of the currently used configurator (Only available for the trigger WebFront)', 'integer'],
				['$_IPS[\'INSTANCE2\']', 'InstanceID #2 that was set in ShutterControl (Only available for the trigger ShutterControl)', 'integer'],
				['$_IPS[\'CLIENTIP\']', 'Received IP adress of the Client (Only for I/O ServerSocket and only for the trigger RegisterVariable)', 'string'],
				['$_IPS[\'CLIENTPORT\']', 'Receiving port of the Client (Only for I/O ServerSocket and only for the trigger RegisterVariable)', 'integer'],
				['$_IPS[\'INSTANCES\']', 'IDs of the sending instances', 'array'],
			];

			for(let global of globals) {
				const c = new vscode.CompletionItem(global[0], vscode.CompletionItemKind.Variable);
				c.documentation = global[1];
				c.detail = global[2];
				completion.push(c);
			}

			return completion;
		}
	});

	/*

		Generator Script:

		<?php

		foreach (IPS_GetModuleList() as $moduleID) {
			$objectID = IPS_CreateInstance($moduleID);
			IPS_SetParent($objectID, 47401);
		}

		$functionList = IPS_GetFunctionList(0);
		asort($functionList);

		$functions = [];
		foreach ($functionList as $function) {
			$functions[] = IPS_GetFunction($function);
		}
		echo json_encode($functions);

	*/

	const functionsCompetionItemsProvider = vscode.languages.registerCompletionItemProvider('php', {

		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

			return buildCompletionItems(document, position, ips_functions);

		}		
	});

	const functionsSignatureHelpProvider = vscode.languages.registerSignatureHelpProvider('php', {

		provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position) {

			return buildSignatureHelp(document, position, ips_functions);

		}
	}, '(,');

	/*

	<?php

	$functions = [];
	$class=new Reflectionclass('IPSModule');
	foreach($class->getMethods() as $method) {
		if($method->isProtected()) {
			$parameters = [];
			foreach($method->getParameters() as $methodParameter) {
				$parameters[] = [
					"Type_" => 4,
					"Description" => $methodParameter->getName(),
					"Enumeration" => []
				];
			}
			$functions[] = [
				"FunctionName" => $method->getName(),
				"Result" => [
					"Type_" => 4,
					"Description" => "Result",
					"Enumeration" => []
				],
				"Parameters" => $parameters
			];
		}
	}
	echo json_encode($functions);

	*/

	const moduleFunctionsCompletionItemsProvider = vscode.languages.registerCompletionItemProvider('php', {

		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

			return buildCompletionItems(document, position, ips_moduleFunctions);

		}
	}, ">");

	const moduleFunctionsSignatureHelpProvider = vscode.languages.registerSignatureHelpProvider('php', {

		provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position) {

			return buildSignatureHelp(document, position, ips_moduleFunctions);

		}
	}, '(,');

	/*

		Generator Script:

		<?php

		$contstants = [];
		foreach(get_defined_constants(true)["IP-Symcon"] as $key => $value) {
			$constants[] = [
				"Name" => $key,
				"Value" => $value
			];
		}
		echo json_encode($constants);

	*/

	const constantsCompletionItemsProvider = vscode.languages.registerCompletionItemProvider('php', {

		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

			let completion: vscode.CompletionItem[] = [];

			for(let constant of ips_constants) {
				const c = new vscode.CompletionItem(constant.Name, vscode.CompletionItemKind.Constant);
				c.detail = constant.Value.toString();
				completion.push(c);
			}

			return completion;

		}		
	});

	context.subscriptions.push(
		globalsCompletionItemsProvider,
		functionsCompetionItemsProvider,
		functionsSignatureHelpProvider,
		moduleFunctionsCompletionItemsProvider,
		moduleFunctionsSignatureHelpProvider,
		constantsCompletionItemsProvider
	);
}
