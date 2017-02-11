RocketBoots.loadComponents([
	"StateMachine",
	"Loop",
	"Incrementer",
	"Dice"
]).ready(function(rb){

	//==== CONSTANTS

	var LOOP_DELAY 			= 10,
		// 1000 = 1 second
		// 100 = 1/10th of a second
		// 10 = 1/100th of a second (better than 60 fps)
		SECONDS_PER_LOOP 	= (LOOP_DELAY / 1000),
		// Update certain things once every X iterations
		// 10 ==> once per second
		LOOP_MODULUS		= 10,
		SAVE_EVERY_MS		= 10000 // 10 seconds
	; 

	//==== GAME, STATES, MAIN LOOP

	var g = new RocketBoots.Game({
		name: "Conspiracy Clicker",
		instantiateComponents: [
			{"state": "StateMachine"},
			{"loop": "Loop"},
			{"incrementer": "Incrementer"},
			{"dice": "Dice"}
		]
	});
	g.version = "beta-1.1.0";
	g.cc = new CCGameClass();

	g.state.addStates({
		"intro": {

		},
		"walkthru": {
			start: function(){
				$('.intro .goto').fadeOut(200);
				$('section.intro').fadeOut(1000, function(){
					$('section.walkthru').fadeIn(1000, function(){
						$('.threeCols').fadeIn(1000);
					});
				});
			},
			end: function(){
				$('.walkthru .goto').fadeOut(200);
				$('section.walkthru').fadeOut(1000,function(){
					g.cc.saveGame();
					g.cc.loadGame(true);
				});				
			}
		},
		"game": {
			viewName: "game",
			start: function(){
				g.cc.calculateCoreValues();
				g.cc.writeUpgrades();
				//o.addFlipCardEvents();
				$('.metrics').slideDown(1000);
				$('.progress').show(2000);
				$('.threeCols').fadeIn(2000, function(){
					g.loop.start();
				});
				
			},
			end: function(){
				g.loop.stop();
			}
		},
		"pause": {

		},
		"menu": {

		},
		"win": {

		}
	});

	g.loop.set(function(iteration){
		// TODO: Use incrementer
		//g.incrementer.incrementByElapsedTime(undefined, true);
		//g.incrementer.calculate();
		g.cc.incrementTotals(iteration);
	}, LOOP_DELAY).addActionPerSecond(function(){
		g.cc.calculateCoreValues();
		g.cc.displayPerSecondNumbers();
		g.cc.displayPerClickNumbers();
	}, 0.6).addActionPerSecond(function(){
		g.cc.displayProgress();
		g.cc.updateUpgradeAfford();
	}, 1).addActionPerSecond(function(){
		g.cc.autoSaveGame();
	}, 2);

	g.cc.setup(); // TODO: move this to state machine


	/* === Original Conspiracy Clicker Game === */

	function CCGameClass () {
		// Constants

		this.totalPopulation = 314000000;
		
		// Static Data
		this.data = {	// Get from JSON data
			"upgrades" 	: {}
			,"groups"	: {}
		};	
		// Game Data
		this.owned = {
			"upgrades" : {
				//"industry" : [], "politics" : [], "media" : []
			}
		};
		this.winShown = false;
		this.isAutoSaveOn = true;
		this.lastSaveDateTime = new Date();
		
		// Constants, Lookups
		this.sectorArray = ["industry", "politics", "media"];
		this.valueTypes = ["indMoney", "polMoney", "medMoney", "votes", "minds"];
		this.shortDisplayValueTypes = {
			"indMoney" 		: "$"
			,"polMoney" 	: "$"
			,"medMoney"		: "$"
			,"votes"		: "votes"
			,"minds"		: "minds"
		};	
		this.displayValueTypes = {
			"indMoney" 		: "industry $"
			,"polMoney" 	: "politics $"
			,"medMoney"		: "media $"
			,"votes"		: "votes"
			,"minds"		: "minds"
		};
		// Game Data
		this.total = {
			indMoney	: 0
			,polMoney	: 0
			,medMoney	: 0
			,votes		: 0
			,minds		: 0
		};
		this.perSecond = {
			//indMoney	: 0
			//,polMoney	: 0
			//,medMoney	: 0
			//,votes		: 0
			//,minds		: 0
		};
		this.perClick = {
			//indMoney	: 1
			//,polMoney	: 1
			//,medMoney	: 1
			//,votes		: 0
			//,minds		: 0	
		};
		this.flow = {
			"from" 			: ""
			,"to"			: ""
			,"baseSpeed"	: 1
			,"percentSpeed"	: 0.005
			,"efficiency"	: 0.75
		};

		

		//=============================================== MAIN LOOP
		
		this.incrementTotals = function(iteration) {
			var o = this;
			o.loopOverCurrencies(function(curr){
				o.incrementCurrency(curr, SECONDS_PER_LOOP);
			});
			o.displayTotals();
		};

		
		//=============================================== OUTPUT DISPLAY

		this.displayProgress = function () {
			
			if (this.total.votes > this.total.minds) {
				var highVal = this.total.votes;
				var lowVal = this.total.minds;
			} else {
				var highVal = this.total.minds;
				var lowVal = this.total.votes;		
			}
			var totalControlled = highVal + (lowVal/2);
			if (totalControlled > this.totalPopulation) {
				totalControlled = this.totalPopulation;
			}
			var progressPercent = (totalControlled / this.totalPopulation) * 100;
			if (progressPercent < 0) {
				progressPercent = Math.round( progressPercent * 100000 ) / 100000;
			} else {
				progressPercent = Math.round( progressPercent * 10 ) / 10;
			}
			this.$progressVal.html(progressPercent + "%");
			this.$progressBar.html('<div style="width: ' + progressPercent + '%"></div>');
			
			if (progressPercent == 100 && !this.winShown) {
				g.state.transition("win");
				this.winShown = true;
			}
		}
		
		this.displayTotals = function () {
			this.displayNumber(this.total.indMoney, this.$indMoneyVal);
			this.displayNumber(this.total.polMoney, this.$polMoneyVal);
			this.displayNumber(this.total.medMoney, this.$medMoneyVal);
			this.displayNumber(this.total.votes, this.$votesVal);
			this.displayNumber(this.total.minds, this.$mindsVal);
		};

		this.displayPerSecondNumbers = function () {
			// Per second...
			this.displayNumber(this.perSecond.indMoney, this.$indMoneyPerSecondVal);
			this.displayNumber(this.perSecond.polMoney, this.$polMoneyPerSecondVal);
			this.displayNumber(this.perSecond.medMoney, this.$medMoneyPerSecondVal);
			this.displayNumber(this.perSecond.votes, this.$votesPerSecondVal);
			this.displayNumber(this.perSecond.minds, this.$mindsPerSecondVal);	
		};

		this.displayPerClickNumbers = function () {
			this.displayNumber(this.perClick.indMoney, this.$indMoneyPerClickVal);
			this.displayNumber(this.perClick.polMoney, this.$polMoneyPerClickVal);
			this.displayNumber(this.perClick.medMoney, this.$medMoneyPerClickVal);
			this.displayNumber(this.perClick.votes, this.$votesPerClickVal);
			this.displayNumber(this.perClick.minds, this.$mindsPerClickVal);
		};
		
		this.displayNumber = function (n, $elt) {
			//console.log($elt);
			$elt.html(this.getDisplayNumber(n));
		}
		
		this.getDisplayNumber = function(n , addK) {
			if (n < 10) {
				n = Math.round( n * 10 ) / 10;
			} else if (n > 99999 && typeof addK === 'boolean' && addK) {
				n = Math.round(n / 1000);
				n = this.getCommaSeparatedNumber(n); //n = n.toLocaleString('en');
				n += "k";
			} else {
				n = parseInt(n);
				n = this.getCommaSeparatedNumber(n); //n = n.toLocaleString('en');
			}
			return n;
		}
		
		this.writeUpgrades = function () {
			for (var sector in this.owned.upgrades) {
				this.writeUpgradesForSector(sector);
			}
		}
		
		this.writeUpgradesForSector = function (sector) {
			var h = "";
			var sectorUpgrades = this.owned.upgrades[sector];
			var lastOwnedUpgradeIndex = -1;
			var SHOW_LAST_UPGRADES = 3;
			var unknownCount = 0;
			for (var ugi in sectorUpgrades) {
				var upgradeCount = sectorUpgrades[ugi];
				var upgrade = this.data.upgrades[sector][ugi];
				var canAfford = this.canAffordUpgrade(sector, ugi);
				
				h += '<li class="upgrade clearfix flip ug-' + ugi;
				if (canAfford) {
					h += ' afford ';
				} else {
					h += ' cannotAfford ';
				}
				if (upgradeCount > 0) {
					h += ' owned ';
					lastOwnedUpgradeIndex = ugi;
				} else {
					h += ' notOwned ';
				}
				if ((ugi - lastOwnedUpgradeIndex) > SHOW_LAST_UPGRADES) {
					h += ' unknown ';
					unknownCount++;
				}
				h += '" ' // end class
					+ ' data-ugi="' + ugi + '" '
					+ ' data-sector="' + sector + '" '
					+ '>'
					+ '<div class="front">'
					+ '<div class="name">' + upgrade.name + '</div>'
					
					+ '<button type="button" class="buy"><div class="buyText">Buy</div>'
				;
				for (var valueType in upgrade.baseCost) {
					var finalCost = this.calcCost(upgrade, upgradeCount, valueType);
					h += '<div class="cost val">'
						+ this.getDisplayNumber(finalCost, true)
						+ ' ' + this.shortDisplayValueTypes[valueType]
						+ '</div>'
					;
				}
				h += '</button>'
					+ '<div class="count">' 
					+ ((upgradeCount == 0) ? '-' : upgradeCount)
					+ '</div>'
					+ '</div>' // endof front
					+ '<div class="back">'
				;
				if (typeof upgrade.details === 'string') {
					h += '<div class="details">' + upgrade.details + '</div>';
				}
				if (typeof upgrade.perSecond === 'object') {
					h += '<ul class="">';
					for (var valueType in upgrade.perSecond) {
						h += '<li>' 
							+ ((upgrade.perSecond[valueType] > 0) ? "+" : "")
							+ this.getDisplayNumber(upgrade.perSecond[valueType])
							+ ' ' + this.displayValueTypes[valueType]
							+ '/sec'
							+ '</li>'
						;
					}
					h += '</ul>';
				}
				h += '</div>' // endof back
					+ '</li>'
				;
			}
			if (unknownCount > 0) {
				h += '<div class="upgrades-tease">+ ' + unknownCount + ' more upgrades</div>';
			}
			if (typeof this.$upgradeLists[sector] !== 'undefined') {
				this.$upgradeLists[sector].html(h);
				this.addFlipCardEvents(this.$upgradeLists[sector]);
			}
		}
		
		this.updateUpgradeAfford = function () {
			for (var sector in this.owned.upgrades) {
				var sectorUpgrades = this.owned.upgrades[sector];
				for (var ugi in sectorUpgrades) {
					var $upgrade = $('section.' + sector + ' .ug-' + ugi);
					var upgradeCount = sectorUpgrades[ugi];
					if (upgradeCount > 0) {
						$upgrade.addClass("owned").removeClass("notOwned");
					} else {
						$upgrade.addClass("notOwned").removeClass("owned");
					}
					var canAfford = this.canAffordUpgrade(sector, ugi);
					if (canAfford) {
						$upgrade.addClass("afford").removeClass("cannotAfford");
					} else {
						$upgrade.addClass("cannotAfford").removeClass("afford");
					}				
				}
			}	
		}

		
		//=============================================== Numbers
		
		this.industryClick = function (evt) {
			this.playSound("coin1");
			this.total.indMoney += this.perClick.indMoney;
			this.animateClickEarning(this.perClick.indMoney, evt);
		}

		this.politicsClick = function (evt) {
			this.playSound("coin2");
			this.total.polMoney += this.perClick.polMoney;
			//this.total.votes += this.perClick.votes;
			this.animateClickEarning(this.perClick.polMoney, evt);
		}

		this.mediaClick = function (evt) {
			this.playSound("coin1");
			this.total.medMoney += this.perClick.medMoney;
			//this.total.minds += this.perClick.votes;
			this.animateClickEarning(this.perClick.medMoney, evt);
		}

		this.animateClickEarning = function (amount, evt) {
			var x = evt.pageX, y = evt.pageY;
			var $div = $('<div class="click-earn">+$' + amount + '</div>').css({
				//position: "absolute",
				opacity: 1
			}).appendTo('body');
			x = x - ($div.width() / 2); // center
			y = y - ($div.height() * 1.5); // go above cursor
			$div.css({ 
				top: 	y + "px",
				left: 	x + "px"
			});
			$div.animate({
				top: (y - 200) + "px",
				left: (x + g.dice.getRandomAround(100)) + "px",
				opacity: 0,
				fontSize: "80%"
			}, 1000, function(){
				$div.remove();
			});
		}
		
		
		this.setDefaults = function () {
			this.perSecond = {
				indMoney	: 0
				,polMoney	: 0
				,medMoney	: 0
				,votes		: 0
				,minds		: 0
			};
			// Count the number of upgrades
			var totalUpgradeCount = 0;
			var upgradeCounts = { "industry" : 0, "politics" : 0, "media" : 0 };
			for (var s in this.sectorArray) {
				var sector = this.sectorArray[s];
				var sectorUpgrades = this.owned.upgrades[sector];
				for (var ugi in sectorUpgrades) {
					upgradeCounts[sector] += sectorUpgrades[ugi];
					totalUpgradeCount += sectorUpgrades[ugi];
				}
			}
			this.perClick = {
				indMoney	: (1.0 + (upgradeCounts.industry / 5))
				,polMoney	: (1.0 + (upgradeCounts.politics / 5))
				,medMoney	: (1.0 + (upgradeCounts.media / 5))
				,votes		: (0.0)
				,minds		: (0.0)
			};
			this.flow.baseSpeed = 1.0 + (totalUpgradeCount / 20);
			return true;
		}
		
		this.isFlowing = function () {
			return (this.flow.from.length > 0 && this.flow.to.length > 0);
		}

		this.incrementCurrency = function (currencyKey, multiplier) {
			this.total[currencyKey] += (this.perSecond[currencyKey] * multiplier);
			if (this.total[currencyKey] < 0) {
				this.total[currencyKey] = 0;
			}
		}

		this.calculateFlowValues = function () {
			var flowSpeed;
			if (this.isFlowing()) {
				flowSpeed = this.flow.baseSpeed + (this.flow.percentSpeed * this.total[this.flow.from]);
				// Make sure the amount flowing from can support it
				if (this.total[this.flow.from] >= flowSpeed) {
					this.perSecond[this.flow.from] -= flowSpeed;
					this.perSecond[this.flow.to] += (flowSpeed * this.flow.efficiency);
				}
			}
		}

		this.calculateCoreValues = function () {
			var o = this;
			this.setDefaults();
			
			// Loop through all upgrades
			this.loopOverSectors(function(sector){
				var sectorUpgrades = o.owned.upgrades[sector];
				for (var ug in sectorUpgrades) {
					var upgradeQuantity = sectorUpgrades[ug];
					if (upgradeQuantity > 0) {
						var upgrade = o.data.upgrades[sector][ug];
						if (typeof upgrade.perSecond === 'object') {
							// Loop through all types and see if the upgrade has values
							for (var vti in o.valueTypes) {
								var valueType = o.valueTypes[vti];
								if (typeof upgrade.perSecond[valueType] === 'number') {
									o.perSecond[valueType] += (upgradeQuantity * upgrade.perSecond[valueType]);
								}						
							}
						}
						if (typeof upgrade.perClick === 'object') {
							// Loop through all types and see if the upgrade has values
							for (var vti in o.valueTypes) {
								var valueType = o.valueTypes[vti];
								if (typeof upgrade.perClick[valueType] === 'number') {
									o.perSecond[valueType] += (upgradeQuantity * upgrade.perClick[valueType]);
								}							
							}					
						}
					}
				}
			});

			this.calculateFlowValues();
		}

		this.loopOverSectors = function (callback) {
			for (var sector in this.owned.upgrades) {
				callback(sector);
			}
		}

		this.loopOverCurrencies = function (callback) {
			var currencies = ["indMoney", "polMoney", "votes", "medMoney", "minds"];
			var numOfCurrencies = currencies.length;
			for (var i = 0; i < numOfCurrencies; i++) {
				callback(currencies[i]);
			}		
		}
		
		this.buyUpgrade = function(sector, upgradeIndex, doWriteUpgrades) {
			console.log("buyUpgrade " + sector + ", " + upgradeIndex);
			var upgrade = this.data.upgrades[sector][upgradeIndex];
			if (this.canAffordUpgrade(sector, upgradeIndex)) {
				// The amount before the purchase
				var upgradeQuantity = this.owned.upgrades[sector][upgradeIndex];
				// Remove the cost from the totals...
				for (var valueType in upgrade.baseCost) {
					this.total[valueType] -= this.calcCost(upgrade, upgradeQuantity, valueType);
				}			
				// Add the upgrade to owned things
				this.owned.upgrades[sector][upgradeIndex] += 1;
				
				if (typeof doWriteUpgrades !== 'boolean') doWriteUpgrades = true;
				if (doWriteUpgrades) this.writeUpgrades();
				this.playSound("upgrade1");
				return true;
			} else {
				this.playSound("dud");
				//this.notify("Cannot afford this upgrade.");
				return false;
			}
		}
		
		this.calcCost = function (upgrade, upgradeQuantity, valueType) {
			var finalCost = upgrade.baseCost[valueType];
			finalCost = (finalCost * Math.pow(upgrade.costMultiplier, upgradeQuantity));
			return finalCost;
		}
		
		this.canAffordUpgrade = function (sector, upgradeIndex) {
			var upgrade = this.data.upgrades[sector][upgradeIndex];
			var upgradeQuantity = this.owned.upgrades[sector][upgradeIndex];
			// Loop over all value types and compare to current totals
			if (typeof upgrade.baseCost === 'object' &&
				typeof upgrade.costMultiplier === 'number') 
			{
				for (var vti in this.valueTypes) {
					var valueType = this.valueTypes[vti];
					if (typeof upgrade.baseCost[valueType] === 'number') {
						var finalCost = this.calcCost(upgrade, upgradeQuantity, valueType);
						if (this.total[valueType] < finalCost) {
							return false;
						}
					}
					
				}
			} else {
				console.error("Upgrade (" + sector + ", " + upgrade + ") is missing baseCost or costMultiplier");
				return false;
			}
			return true;
		}
		

		
		//=============================================== SETUP & LAUNCH
		
		this.notify = function (t) {
			console.warn(t);
			alert(t);
		}
		
		this.addFlipCardEvents = function ($elt) {
			console.log("Adding flipcard events");
			if (typeof $elt === 'undefined') {
				var $base = $('.flip');
			} else {
				var $base = $elt.find('.flip');
			}
			$base.off("click").click(function () {
				var $flipcard = $(this);
				if ($flipcard.hasClass("flipped")) {
					$flipcard.removeClass('flipped');
				} else {
					$flipcard.addClass('flipped');
				}
			});
		}
		
		this.setup = function () {
			var o = this;
			var ajaxGetData = {};
			
			$.ajax({
				type: 		"get"
				,url:		"data/cc_data.json"
				,dataType: 	"json"
				,complete: function(x,t) {
				}
				,success: function(responseObj) {
					try {
						//var responseObj = $.parseJSON(response);
						o.data.upgrades = responseObj.upgrades;
						o.data.groups 	= responseObj.groups;
						console.log("Ajax Success loading data");
					} catch (err) {
						o.notify("ERROR IN JSON DATA");
						console.log(responseObj);
					}
					// Loop through upgrade data and setup default ownership
					for (sector in o.data.upgrades) {
						o.owned.upgrades[sector] = [];
						for (ug in o.data.upgrades[sector]) {
							o.owned.upgrades[sector][ug] = 0;
						}
					}
				}
				,failure: function(msg) {
					console.log("Fail\n"+ msg);
				}
				,error: function(x, textStatus, errorThrown) {
					console.log("Error\n" + x.responseText + "\nText Status: " + textStatus + "\nError Thrown: " + errorThrown);
				}
			});
		
		
		
			//=========== Setup UI

			$('.version').html(g.version);
			
			var $indClicker = $('section.industry .clicker');
			var $polClicker = $('section.politics .clicker');
			var $medClicker = $('section.media .clicker');
			o.$indMoneyVal 			= $('section.industry .money .val');
			o.$indMoneyPerClickVal 	= $('section.industry .profitPerClick .val');
			o.$indMoneyPerSecondVal	= $('section.industry .profitPerSecond .val');
			
			o.$polMoneyVal 			= $('section.politics .money .val');
			o.$polMoneyPerClickVal	= $('section.politics .profitPerClick .val');
			o.$polMoneyPerSecondVal = $('section.politics .profitPerSecond .val');
			o.$votesVal				= $('section.politics .votes .val');
			o.$votesPerClickVal 	= $('section.politics .votesPerClick .val');
			o.$votesPerSecondVal 	= $('section.politics .votesPerSecond .val');
			
			o.$medMoneyVal 				= $('section.media .money .val');
			o.$medMoneyPerClickVal 		= $('section.media .profitPerClick .val');
			o.$medMoneyPerSecondVal 	= $('section.media .profitPerSecond .val');
			o.$mindsVal 				= $('section.media .minds .val');
			o.$mindsPerClickVal 		= $('section.media .mindsPerClick .val');
			o.$mindsPerSecondVal 		= $('section.media .mindsPerSecond .val');		
			
			o.$progressVal = $('section.progress .progressVal');
			o.$progressBar = $('section.progress .progressBar');
			
			$indClicker.click(function(e){	o.industryClick(e); });
			$polClicker.click(function(e){	o.politicsClick(e); });
			$medClicker.click(function(e){	o.mediaClick(e); });
			
			$('.save').click(function(e){
				o.playSound("save1");
				o.saveGame(true);
			});
			$('.load').click(function(e){
				o.playSound("save1");
				o.loadGame();
			});
			$('.delete').click(function(e){
				o.playSound("shock1");
				o.deleteGame(true);
				if (confirm("Reload page to start a new game?")) {
					window.location.reload(true); 
				}
			});
			$('.toggleSound').click(function(e){
				var x = o.toggleSound();
				o.notify("Sound turned " + ((x) ? "ON" : "OFF"));
			});
			$('.toggleAutoSave').click(function(e){
				o.isAutoSaveOn = !o.isAutoSaveOn;
				o.notify("AutoSave turned " + ((o.isAutoSaveOn) ? "ON" : "OFF"));
			});		
			
			/* Intro */
			$('.openWalkthru').click(function(e){
				g.state.transition("walkthru");
			});
			$('.openGame').click(function(e){
				g.state.transition("game");
			});
			
			
			
			
			var $arrows = $('.focus .arrow');
			$arrows.click(function(e){
				var $thisArrow = $(this);
				if ($thisArrow.hasClass("active")) {
					$arrows.removeClass("active");
					o.flow.from = "";
					o.flow.to = "";
				} else {
					o.playSound("transfer1");
					$arrows.removeClass("active");
					$thisArrow.addClass("active");
					o.flow.from = $thisArrow.data("flowfrom");
					o.flow.to = $thisArrow.data("flowto");
				}
			});
			
			o.$upgradeLists = {};
			
			$('.metrics').click(function(e){
				$(this).find('.perClick').toggle(300);
			});
			
			for (var s in o.sectorArray) {
				(function(sector){
					o.$upgradeLists[sector] = $('section.' + sector + ' ul.upgradeList');
					//console.log("Adding click event to List for sector: " + sector);
					//console.log(o.$upgradeLists[sector]);
					
					o.$upgradeLists[sector].on("click", function(e){
						
						var $target = $(e.target);
						var $ugli = $target.closest('li.upgrade');
						//console.log("List Clicked - sector: " + sector);
						//console.log($ugli);

						if ($target.hasClass("buy") || $target.parent().hasClass("buy")) {
							var upgradeIndex = $ugli.data("ugi");
							o.buyUpgrade(sector, upgradeIndex);
						} else {
							//$ugli.find('.details').toggle();
						}
						e.stopPropagation();
					});
				}(o.sectorArray[s]));
			}
			
			// Scroll Event
			var $win = $(window);
			var $3cols = $('.threeCols');
			$win.scroll(function() {
				var height = $win.scrollTop();
				//console.log(height);
				if (height > 650) {
					$3cols.addClass("fixed");
				} else {
					$3cols.removeClass("fixed");
				}
			});
			
			
			$('.pause').click(function(e){ 	
				if (g.state.current.name === "game") {
					g.state.transition("pause");
				} else {
					g.state.transition("game");
				}
			});
			
			//$('.upgradeList > li').click(function(e){	o.buyUpgrade(1); });


			//=========== Launch!
			var launchTimer = window.setTimeout(function(){
				o.launch(0);
			}, 250);
		}
		
		this.launch = function (iteration) {
			var o = this;
			iteration++;
			if (Object.keys(o.data.upgrades).length > 0) {
				console.log("Launching Game!");
				o.loadGame();
			} else if (iteration < 40) {
				console.log("Launch... Cannot start yet. " + iteration);
				var launchTimer = window.setTimeout(function(){
					o.launch(iteration);
				}, 250);			
			} else {
				o.notify("Cannot launch game.");
			}
		}
		
		this.autoSaveGame = function () {
			if (this.isAutoSaveOn) {
				var now = new Date();
				if ((now - this.lastSaveDateTime) > SAVE_EVERY_MS) {
					this.saveGame();
				}
			}
		};

		this.saveGame = function(showNotice) {
			localStorage.setItem("owned", JSON.stringify(this.owned));
			localStorage.setItem("total", JSON.stringify(this.total));
			localStorage.setItem("isSoundOn", JSON.stringify(this.isSoundOn));
			
			this.lastSaveDateTime = new Date();
			
			if (typeof showNotice === 'boolean') { 
				if (showNotice) this.notify("Game has been saved to this browser. Your game will be automatically loaded when you return.");
			}
		}
		
		this.deleteGame = function() {
			localStorage.removeItem("owned");
			localStorage.removeItem("total");
			this.notify("Saved game deleted!");
		}	
		
		this.loadGame = function () {
			var o = this;
			var isLoaded = false;
			// Load game data (two objects)
			console.log("checking localStorage", localStorage.getItem("owned"), localStorage.getItem("total"));
			var loadedOwned = localStorage.getItem("owned");
			if (loadedOwned !== null) {
				o.owned = JSON.parse(loadedOwned);
				isLoaded = true;
			}
			var loadedTotal = localStorage.getItem("total");
			if (loadedTotal !== null) {
				o.total = JSON.parse(loadedTotal);
				isLoaded = true;
			}
			var loadedSound = localStorage.getItem("isSoundOn");
			if (loadedSound !== null) {
				o.isSoundOn = JSON.parse(loadedSound);
			}		

			$('body > header').fadeIn(200);
			if (!isLoaded) {
				$('.intro').fadeIn(1000);
			} else {
				g.state.transition("game");
			}
		}

		
		//========================================= SOUND

		this.isSoundOn = false;
		
		this.toggleSound = function (forceSound) {
			if (typeof forceSound === 'boolean') 	this.isSoundOn = forceSound;
			else									this.isSoundOn = (this.isSoundOn) ? false : true;
			return this.isSoundOn;	
		}

		this.sounds = {
			"coin1" 		: new Audio("sounds/coin1.mp3")
			,"coin2" 		: new Audio("sounds/coin2.mp3")
			,"dud1" 		: new Audio("sounds/dud1.mp3")
			,"dud2" 		: new Audio("sounds/dud2.mp3")
			,"save1" 		: new Audio("sounds/save1.mp3")
			,"transfer1" 	: new Audio("sounds/transfer1.mp3")
			,"upgrade1" 	: new Audio("sounds/upgrade1.mp3")
			,"shock1" 	: new Audio("sounds/shock1.mp3")
		}	
		
		this.playSound = function (soundName, isLooped) {
			if (this.isSoundOn) {	
				if (soundName == "coin" || soundName == "dud") {
					soundName += g.dice.roll1d(2);
				}	
				if (typeof this.sounds[soundName] === 'undefined') {
					console.log("Sound does not exist: " + soundName);
					return false;
				} else {
					if (typeof isLooped === 'boolean') {
						this.sounds[soundName].loop = isLooped;
					}
					this.sounds[soundName].play();
					return true;
				}
			} else {
				return false;
			}
		}
		
		//========================================= Helpers
		
		this.getCommaSeparatedNumber = function (val) {
			// From: http://stackoverflow.com/a/12947816/1766230
			while (/(\d+)(\d{3})/.test(val.toString())){
				val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
			}
			return val;
		}	

		//========================================= Construction
		if (!window.localStorage) {
			alert("This browser does not support localStorage, so this app will not run properly. Please try another browser, such as the most current version of Google Chrome.");
		}
		if (!window.jQuery) { alert("ERROR - jQuery is not loaded!"); }
	}

	// Expose to the window object for debugging
	window.g = g;
});