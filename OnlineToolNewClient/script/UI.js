let ContentTabs = {
	engine: "tab-engine",
	modelEditor: "tab-model-editor",
	results: "tab-results",
}

const DOUBLE_CLICK_DELAY = 400;

/**
	Allows access to operations with the global UI (i.e. operating the menus, showing content panels, etc.).
*/
let UI = {
	// Element where the cytoscape editor resides.
	cytoscapeEditor: undefined,
	// Element of the menu that is displayed for each node/edge when selected.
	_nodeMenu: undefined,
	_edgeMenu: undefined,
	// Contains pairs of elements of the form { button: ..., tab: ... } corresponding to the side menu.
	_tabsAndButtons: undefined,

	//Array containing divs od different pages [model-div, control-results-div, explorer-div, tree-explorer-div]
	_pageDivs: undefined,

	isMouseDown: false,

	/** Functions used for import of model from a file. */
	ImportFile: {
		// Import Aeon file from the given file input element (if possible)
		importAeon(element) {
			var file = element.files[0];
			if (file) {
				var fr = new FileReader();
				fr.onload = (e) => {
					let error = LiveModel.Import.importAeon(e.target.result);
					if (error !== undefined) {
						alert(error);
					}
					element.value = null;
				};
				fr.readAsText(file);
			}        
		},

		importSBML(element) {
			var file = element.files[0];
			if (file) {
				var fr = new FileReader();
				fr.onload = (e) => {
					let sbml_file = e.target.result;
					UI.isLoading(true);
					ComputeEngine.Format.sbmlToAeon(sbml_file, (error, result) => {        		
						UI.isLoading(false);
						if (result !== undefined) {
							let aeonModel = result.model;
							error = LiveModel.Import.importAeon(aeonModel);
						}
						if (error !== undefined) {
							alert(error);
						}
						element.value = null;
					});        	
				};
				fr.readAsText(file);
			}        
		},

		importBnet(element) {
			var file = element.files[0];
			if (file) {
				var fr = new FileReader();
				fr.onload = (e) => {
					let bnet_file = e.target.result;
					UI.isLoading(true);
					ComputeEngine.Format.bnetToAeon(bnet_file, (error, result) => {        		
						UI.isLoading(false);
						if (result !== undefined) {
							let aeonModel = result.model;
							error = LiveModel.Import.importAeon(aeonModel);
						}
						if (error !== undefined) {
							alert(error);
						}
						element.value = null;
					});        	
				};
				fr.readAsText(file);
			}        
		},
	},

	/** Functions used for download of model into file. */
	DownloadFile: {
		// Trigger a download of Aeon exported file of the current model (if possible)
		downloadAeon() {
			let modelFile = LiveModel.Export.exportAeon();
			if (modelFile === undefined) {
				alert(Strings.modelEmpty);
				return;
			}
			let filename = ModelEditor.getModelName();
			if (filename === undefined) {
				filename = "model";
			}
			this._downloadFile(filename + ".aeon", modelFile)
		},

		downloadSBML() {
			let modelFile = LiveModel.Export.exportAeon();
			if (modelFile === undefined) {
				alert(Strings.modelEmpty);
				return;
			}
			let filename = ModelEditor.getModelName();
			if (filename === undefined) {
				filename = "model";
			}
			UI.isLoading(true);
			ComputeEngine.Format.aeonToSbml(modelFile, (error, result) => {
				UI.isLoading(false);
				if (error !== undefined) {
					alert(error);
				}
				if (result !== undefined) {
					let sbml = result.model;
					this._downloadFile(filename + ".sbml", sbml);
				}
			});
		},

		downloadBnet() {
			let modelFile = LiveModel.Export.exportAeon();
			if (modelFile === undefined) {
				alert(Strings.modelEmpty);
				return;
			}
			let filename = ModelEditor.getModelName();
			if (filename === undefined) {
				filename = "model";
			}
			UI.isLoading(true);
			ComputeEngine.Format.aeonToBnet(modelFile, (error, result) => {
				UI.isLoading(false);
				if (error !== undefined) {
					alert(error);
				}
				if (result !== undefined) {
					let bnet = result.model;
					this._downloadFile(filename + ".bnet", bnet);
				}
			});
		},

		// TODO: Join the with the standard export SBML function - they do almost the same thing anyway.
		downloadSBMLInstantiated() {
			let modelFile = LiveModel.Export.exportAeon();
			if (modelFile === undefined) {
				alert(Strings.modelEmpty);
				return;
			}
			let filename = ModelEditor.getModelName();
			if (filename === undefined) {
				filename = "model";
			}
			UI.isLoading(true);
			ComputeEngine.Format.aeonToSbmlInstantiated(modelFile, (error, result) => {
				UI.isLoading(false);
				if (error !== undefined) {
					alert(error);
				}
				if (result !== undefined) {
					let sbml = result.model;
					this._downloadFile(filename + "_instantiated.sbml", sbml);
				}
			});
		},

		_downloadFile(name, content) {
			var el = document.createElement('a');
			el.setAttribute('href', 'data:text/plain;charset=utf-8,'+encodeURIComponent(content));
			el.setAttribute('download', name);
			el.style.display = 'none';
			document.body.appendChild(el);
			el.click();
			document.body.removeChild(el);
		},
	},

	/** Functions used for opening new inner tabs and browser tabs. */
	Open: {
		openWitness(witness) {
			if (!UI.testResultsAvailable()) {return;};
	
			const url = window.location.pathname;
			console.log(window.location.pathname);
			window.open(url + '?engine=' + encodeURI(ComputeEngine.Connection.getAddress()) + "&witness="+ encodeURI(witness));
		},
	
		openExplorer(behavior) {
			if (!UI.testResultsAvailable()) {return;};
	
			Explorer.openNewExplorer(behavior);
		},
	
		openTreeExplorer() {
			if (!UI.testResultsAvailable()) {return;};
	
			TabBar.addTab("tree-explorer", {});
			TreeExplorer.openNewTreeExplorer();
		},

		//Opens new browser tab with contents of currently active inner tab.
		//If type of the initial tab is "model", then withResults determines
		//if the calculated results should be present in the new browser tab.
		openBrowserTab(withResults = true) {
			const tabId = TabBar.getNowActiveId();
			const tab = TabBar.getTab(tabId)

			if (tab.type == "model") {
				const modelString = LiveModel.Export.exportAeon(false, withResults);
				tab.data = modelString;
				LiveModel.modelSave = modelString;
			}

			const newWindow = open("index.html", "_Blank");

			newWindow.initialTabInfo = {"type":tab.type, "data": JSON.stringify(tab.data)};
			newWindow.modelId = window.modelId;
			newWindow.nextModelId = window.nextModelId;
			newWindow.modelCalc = window.modelCalc;
			newWindow.lastComputation = withResults == true ? ComputeEngine.Computation.getLastComputation() : undefined;
			newWindow.model = LiveModel.modelSave;
		}
	},

	init: function() {
		this.cytoscapeEditor = document.getElementById("cytoscape-editor");		
		this._nodeMenu = document.getElementById("node-menu");
		this._edgeMenu = document.getElementById("edge-menu");

		this._pageDivs = [document.getElementById("model-div"),
							document.getElementById("control-results-div"),
								document.getElementById("explorer-div"),
									document.getElementById("tree-explorer-div")
		]
		
		let sideMenu = document.getElementById("side-menu");
		let sideMenuButtons = sideMenu.getElementsByClassName("button");
		this._tabsAndButtons = [];
	
		for (var i = 0; i < sideMenuButtons.length; i++) {
			let button = sideMenuButtons[i];
			let tab = document.getElementById(button.getAttribute("tab-id"));
			this._tabsAndButtons.push({ tab: tab, button: button });
		}

		this._initNodeMenu(this._nodeMenu);
		this._initEdgeMenu(this._edgeMenu);
		this._initSideMenu(sideMenu);	
	},

	// Add a listener to each button to display hint texts when hovered.
	// For toggle buttons, add functions that enable actual toggling of the state value.
	_initEdgeMenu(menu) {
		// make hint work
		let hint = menu.getElementsByClassName("hint")[0];
		let buttons = menu.getElementsByClassName("button");
		for (var i = 0; i < buttons.length; i++) {
			let button = buttons[i];
			button.addEventListener("mouseenter", (e) => {
				hint.textContent = button.alt;
				hint.classList.remove("invisible");
			});
			button.addEventListener("mouseleave", (e) => {
				hint.classList.add("invisible");
			});
		}
		// Make observability button react to regulation state:
		let observability = document.getElementById("edge-menu-observability");
		observability.updateState = function(data) {
			let state = "off";
			if (data.observable) state = "on";
			if (state != observability.getAttribute("state")) {
				observability.setAttribute("state", state);
				observability.alt = observability.getAttribute("alt-"+state);
				observability.src = observability.getAttribute("src-"+state);
				// if the hint is visible, it must be showing alt of this button (because the value just changed)
				hint.textContent = observability.alt;
			}
		};
		observability.addEventListener("click", (e) => {
			let selected = CytoscapeEditor.getSelectedRegulationPair();
			if (selected !== undefined) {
				LiveModel.Regulations.toggleObservability(selected.regulator, selected.target);
			}
		});
		menu.observabilityButton = observability;
		let monotonicity = document.getElementById("edge-menu-monotonicity");
		monotonicity.updateState = function(data) {
			if (monotonicity.getAttribute("state") != data.monotonicity) {
				monotonicity.alt = monotonicity.getAttribute("alt-"+data.monotonicity);
				monotonicity.src = monotonicity.getAttribute("src-"+data.monotonicity);
				monotonicity.setAttribute("state", data.monotonicity);
				// if the hint is visible, it must be showing alt of this button (because the value just changed)
				hint.textContent = monotonicity.alt;
			}				
		};
		monotonicity.addEventListener("click", (e) => {
			let selected = CytoscapeEditor.getSelectedRegulationPair();
			if (selected !== undefined) {
				LiveModel.Regulations.toggleMonotonicity(selected.regulator, selected.target);
			}
		});
		menu.monotonicityButton = monotonicity;
		let removeButton = document.getElementById("edge-menu-remove");
		removeButton.addEventListener("click", (e) => {
			let selected = CytoscapeEditor.getSelectedRegulationPair();
			if (selected !== undefined) {
				LiveModel.Regulations.removeRegulation(selected.regulator, selected.target);
			}
		});
	},

	// Add a listener to each button which displays its alt as hint text when hovered
	// and make the buttons actually clickable with actions.
	_initNodeMenu: function(menu) {
		// make hint work
		let hint = menu.getElementsByClassName("hint")[0];
		let buttons = menu.getElementsByClassName("button");		
		for (var i = 0; i < buttons.length; i++) {
			let button = buttons[i];
			button.addEventListener("mouseenter", (e) => {
				hint.textContent = button.alt;
				hint.classList.remove("invisible");
			});
			button.addEventListener("mouseleave", (e) => {
				hint.classList.add("invisible");
			});
		}
		// Remove node button
		let removeButton = document.getElementById("node-menu-remove");
		removeButton.addEventListener("click", (e) => {
			let selectedNodeId = CytoscapeEditor.getSelectedNodeId();
			if (selectedNodeId !== undefined) {
				LiveModel.Variables.removeVariable(selectedNodeId);
			}
		});
		// Edit node name button
		let editNameButton = document.getElementById("node-menu-edit-name");
		editNameButton.addEventListener("click", (e) => {
			let selectedNodeId = CytoscapeEditor.getSelectedNodeId();
			if (selectedNodeId !== undefined) {
				ModelEditor.focusNameInput(selectedNodeId);
			}
		});
		// Edit function button
		let editFunctionButton = document.getElementById("node-menu-edit-function");
		editFunctionButton.addEventListener("click", (e) => {
			let selectedNodeId = CytoscapeEditor.getSelectedNodeId();
			if (selectedNodeId !== undefined) {
				ModelEditor.focusFunctionInput(selectedNodeId);
			}
		})
	},

	// Add a hover listener to all side menu items to show hint when needed.
	// Add a click listener that will toggle the appropriate tab for each button.
	_initSideMenu: function(menu) {
		let groups = menu.getElementsByClassName("button-group");
		for (var i = 0; i < groups.length; i++) {
			let group = groups[i];
			let button = group.getElementsByClassName("button")[0];
			let hint = group.getElementsByClassName("hint")[0];
			let tabId = button.getAttribute("tab-id");
			// Show hint popup on mouse enter when button is not selected.
			button.addEventListener("mouseenter", (e) => {
				let selected = button.classList.contains("selected");
				if (!selected) {
					group.style.width = "272px";
					hint.classList.remove("invisible");
				}
			});
			// Hide hint popup on mouse leave
			button.addEventListener("mouseleave", (e) => {
				group.style.width = "59px";
				hint.classList.add("invisible");
			});
			// On click, if selected, close content. If not selected, switch to this tab.
			button.addEventListener("click", (e) => {
				let selected = button.classList.contains("selected");
				if (selected) {
					UI.closeContent();
				} else {
					UI.ensureContentTabOpen(tabId);
					// Also, hide the hint popup
					group.style.width = "59px";
					hint.classList.add("invisible");
				}				
			});
		};
	},

	//Gets time from ms timestamp in this format HOURS:MINUTES:SECONDS.
	_getTime(timestamp) {
		const date = new Date(timestamp);

		let addZero = function(number) {
			return number < 10 ? "0" + number : number;
		}

		return addZero(date.getHours()) + ":" + addZero(date.getMinutes()) + ":" + addZero(date.getSeconds());
	},

	updateComputeEngineStatus(status, data) {
		let connectButton = document.getElementById("button-connect");
		let statusComp = document.getElementById("compute-engine-status");
		let statusBar = document.getElementById("status-bar");
		let addressInput = document.getElementById("engine-address");
		let dot = document.getElementById("engine-dot");
		let cmp = document.getElementById("computation");
		let cmpStatus = document.getElementById("computation-status");
		let cmpProgress = document.getElementById("computation-progress");
		let cmpClasses = document.getElementById("computation-classes");
		let cmpCancel = document.getElementById("computation-cancel");
		let cmpDownload = document.getElementById("computation-download");
		// Reset classes
		statusBar.classList.remove("red", "green", "orange");
		statusComp.classList.remove("red", "green", "orange");
		dot.classList.remove("red", "green", "orange");
		cmpStatus.classList.remove("red", "green", "orange");
		if (status == "connected") {
			addressInput.setAttribute("disabled", "1");
			// Also do this for parent, because we want to apply some css based on this
			// to the container as well.
			addressInput.parentElement.setAttribute("disabled", "1");
			statusComp.textContent = " ● Connected";
			connectButton.innerHTML = "Disconnect <img src='img/cloud_off-24px.svg'>";
			if (data !== undefined) {
				// data about computation available
				let status = "(none)";
				// If there is a computation, it is probably running...
				if (data["timestamp"] !== null) {
					status = "running";
					// ...but, if it is cancelled, we are awaiting cancellation...
					if (data["is_cancelled"]) {
						status = "awaiting cancellation";
					}
					// ...but, if it is not running and it is not cancelled, then it must be done...
					if (!data["is_running"] && !data["is_cancelled"]) {
						status = "done";
					}
					// ...and, if it is not running and it is cancelled, the it is actualy cancelled.
					if (!data["is_running"] && data["is_cancelled"]) {
						status = "cancelled";
					}
				}
				// Update server status color depending on current computation status.
				if (status == "(none)" || status == "done" || status == "cancelled") {
					statusBar.classList.add("green");
					statusComp.classList.add("green");
					dot.classList.add("green");
				} else {
					statusBar.classList.add("orange");
					statusComp.classList.add("orange");
					dot.classList.add("orange");
				}
				// Make status green/orange depending on state of computation.
				if (status == "done") {
					cmpStatus.classList.add("green");
				} else if (status != "(none)") {
					cmpStatus.classList.add("orange");
				}

				if (data.error !== undefined && data.error !== null) {
					status += ", error: "+ data.error;
				}

				// Progress is only shown when we are running...
				if (data["is_running"]) {
					statusBar.textContent = status + " " + data.progress.slice(0, 6);
					cmpProgress.parentElement.classList.remove("gone");
				} else {
					statusBar.textContent = status != "(none)" ? status + " " + this._getTime(data.timestamp):
																	statusBar.textContent = " ● Connected";
					cmpProgress.parentElement.classList.add("gone");
				}
				cmp.classList.remove("gone");
				cmpStatus.innerHTML = status;
				cmpProgress.textContent = data.progress;
				if (data.num_classes !== null) {
					cmpClasses.textContent = data.num_classes;
				} else {
					cmpClasses.textContent = "-";
				}
				// Show cancel button if job is running and not cancelled 
				if (data["is_running"] && !data["is_cancelled"]) {
					cmpCancel.classList.remove("gone");
				} else {
					cmpCancel.classList.add("gone");
				}
				// Show download button if there is a job, but unless it is done, show "partial" in the button
				if (data["timestamp"] !== null) {
					cmpDownload.classList.remove("gone");
					if (status == "done") {
						cmpDownload.innerHTML = "Show result <img src=\"img/cloud_download-24px.svg\">";
					} else {
						cmpDownload.innerHTML = "Show partial result <img src=\"img/cloud_download-24px.svg\">";
					}
				} else {
					cmpDownload.classList.add("gone");
				}
			

				if (data["timestamp"] !== undefined && Results.hasResults()) {
					// show warning if data is out of date
					ComputeEngine.Computation.setActiveComputation(data["timestamp"]);
					if (ComputeEngine.Computation.hasActiveComputation()) {
						document.getElementById("results-expired").classList.add("gone");
					} else {
						document.getElementById("results-expired").classList.remove("gone");
					}
				} else {
					document.getElementById("results-expired").classList.add("gone");
				}			

				if (status == "done" && ComputeEngine.Computation.waitingForResult) {
					ComputeEngine.Computation.waitingForResult = false;
					Results.download();
				}
			}
		} else {
			addressInput.removeAttribute("disabled");
			addressInput.parentElement.removeAttribute("disabled");
			statusBar.textContent = " ● Disconnected";
			statusBar.classList.add("red");
			statusComp.textContent = " ● Disconnected";
			statusComp.classList.add("red");
			dot.classList.add("red");
			connectButton.innerHTML = "Connect <img src='img/cloud-24px.svg'>";
			cmp.classList.add("gone");
		}
	},

	isEdgeMenuVisible() {
		return !this._edgeMenu.classList.contains("invisible");
	},

	isNodeMenuVisible() {
		return !this._nodeMenu.classList.contains("invisible");
	},

	// Close any content tab, if open.
	closeContent() {
		this.ensureContentTabOpen(undefined);
	},

	// A small utility method to show quick help.
	setQuickHelpVisible(visible) {
		if (visible || LiveModel.isEmpty()) {
			document.getElementById("quick-help").classList.remove("gone");
		} else {
			document.getElementById("quick-help").classList.add("gone");
		}
	},

	// Make sure the given content tab is open (for example because there is content in it that
	// needs to be seen).
	ensureContentTabOpen(tabId) {
		for (var i = 0; i < this._tabsAndButtons.length; i++) {
			let item = this._tabsAndButtons[i];
			if (item.tab.getAttribute("id") == tabId) {
				item.button.classList.add("selected");
				item.tab.classList.remove("gone");
			} else {
				item.button.classList.remove("selected");
				item.tab.classList.add("gone");
			}			
		}	
	},	

	// If given a position, show the center of the node menu at that position.
	// If no position is given, hide the menu.
	// ([Num, Num], Float = 1.0)
	toggleNodeMenu: function(position, zoom = 1.0) {
		let menu = this._nodeMenu;
		if (position === undefined) {
			menu.classList.add("invisible");			
			menu.style.left = "-100px";	// move it somewhere out of clickable area
			menu.style.top = "-100px";
		} else {
			menu.classList.remove("invisible");
			menu.style.left = position[0] + "px";
			menu.style.top = (position[1] + (60 * zoom)) + "px";
			// Scale applies current zoom, translate ensures the middle point of menu is 
			// actually at postion [left, top] (this makes it easier to align).
			// Note the magic constant next to zoom: It turns out we needed smaller font
			// size on the editor nodes (to make import more reasonable).
			// However, that made the menu much too big, so we are sticking with "zooming out"
			// the menu and keeping smaller sizes in the graph.
			menu.style.transform = "scale(" + (zoom * 0.75) + ") translate(-50%, -50%)";			
		}			
	},

	// Show the edge menu at the specified position with the provided data { observability, monotonicity }
	// If data or position is indefined, hide menu.
	toggleEdgeMenu(data, position, zoom = 1.0) {
		let menu = this._edgeMenu;
		if (position === undefined || data === undefined) {
			menu.classList.add("invisible");
			menu.style.left = "-100px";	// move it somewhere out of clickable area
			menu.style.top = "-100px";
		} else {
			menu.classList.remove("invisible");
			menu.style.left = position[0] + "px";
			menu.style.top = (position[1] + (60 * zoom)) + "px";
			// Scale applies current zoom, translate ensures the middle point of menu is 
			// actually at postion [left, top] (this makes it easier to align).			
			menu.style.transform = "scale(" + (zoom * 0.75) + ") translate(-50%, -50%)";
			menu.observabilityButton.updateState(data);
			menu.monotonicityButton.updateState(data);
		}
	},

	isLoading(status) {
		if (status) {
			document.getElementById("loading-indicator").classList.remove("invisible");
		} else {
			document.getElementById("loading-indicator").classList.add("invisible");
		}
	},

	//Tests if results are available. If not, then alerts the user.
	testResultsAvailable() {
		if (!ComputeEngine.Computation.hasActiveComputation()) {
			alert("Results no longer available.");
			return false;
		}

		return true;
	},

	_switchVisibleDiv(divIndex) {
		for (let i = 0; i < this._pageDivs.length; i++) {
			if (i == divIndex) {
				this._pageDivs[i].style.display = "";
			} else {
				this._pageDivs[i].style.display = "none";
			}
		}
	},

	//Toggles between data shown in the window. (used when inner tabs are switched)
	toggleDiv(type, data) {
		if (type == "model") {
			this._switchVisibleDiv(0);
			LiveModel.Import.importAeon(data, true);
		} else if (type == "control results") {
			this._switchVisibleDiv(1);
			ControlResults.insertData(data);
		} else if (type == "explorer") {
			this._switchVisibleDiv(2);
			Explorer.insertData(data)
		} else {
			this._switchVisibleDiv(3);
		}
	},
}
