let c;
let canvasLength = 0;
let fittsLaw = {};

function FittsLaw() {
    this.canvas = {};
    this.noOfTargets = 0;
    this.targets = [];
    this.targetOrderIndices = [];
    this.targetSizes = [];
    this.targetDistances = [];
    this.currentTargetIndex = 0;
    this.currentSizeIndex = 0;
    this.currentDistanceIndex = 0;
    this.beginTime = 0;
    this.beginX = 0;
    this.beginY = 0;
    this.measurements = [];

    this.init = function () {
        console.log('Init');
        this.canvas = document.querySelector('canvas');
        this.canvas.width = this.canvas.height = canvasLength = Math.min(window.innerWidth, window.innerHeight) - 40;
        this.canvas.addEventListener('click', this.onClick);
        c = this.canvas.getContext('2d');
    };

    this.begin = function () {
        window.scrollTo(this.canvas.offsetLeft, this.canvas.offsetTop - 20);

        this.measurements = [];
        this.noOfTargets = this.getValue('#targeter');
        this.targetSizes = [
            this.getValue('#targetSizer1'),
            this.getValue('#targetSizer2')
        ];
        this.targetSizes = this.shuffle(this.targetSizes);

        this.targetDistances = [
            this.getValue('#distancer1'),
            this.getValue('#distancer2'),
            this.getValue('#distancer3')
        ];

        c.clearRect(0, 0, canvasLength, canvasLength);
        this.drawTargets();

        this.currentSizeIndex = 0;
        this.currentDistanceIndex = 0;
        this.currentTargetIndex = -1; //This is incremented in nextTarget()
        this.nextTarget();
    };

    this.shuffle = function(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    };

    this.getValue = function (selector) {
        return Number(document.querySelector(selector).value);
    };

    this.updateMeasurement = function (x, y, errorRate) {
        if (this.beginTime === 0) {
            this.beginTime = Date.now();
            this.beginX = x;
            this.beginY = y;
        } else {
            const timeTaken = Date.now() - this.beginTime;
            const measurement = {
                size: this.targetSizes[this.currentSizeIndex] * 2,
                distance: this.targetDistances[this.currentDistanceIndex] * 2,
                duration: timeTaken,
                errorRate: errorRate,
                effectiveDistance: Math.round(getDistance(this.beginX, x, this.beginY, y))
            };
            this.measurements.push(measurement);
            console.log(measurement);
            this.beginTime = 0;
        }
    };

    this.onClick = function (event) {
        // console.log(event);
        const x = event.offsetX || event.layerX;
        const y = event.offsetY || event.layerY;
        const currentTarget = fittsLaw.getCurrentTarget();
        if (!currentTarget) {
            return;
        }
        const errorRate = currentTarget.trySelect(x, y);
        if (errorRate >= 0) {
            fittsLaw.updateMeasurement(x, y, errorRate);
            if (!fittsLaw.nextTarget()) {
                const tableWrapper = document.querySelector('.results-table');
                while (tableWrapper.firstChild) {
                    tableWrapper.removeChild(tableWrapper.firstChild);
                }
                const measurements = fittsLaw.getMeasurementsTable();

                const anchor = document.createElement('a');
                anchor.href = 'data:application/csv;charset=utf-8,' + encodeURIComponent(measurements.csv);
                anchor.download = 'fittsLawData.csv';
                anchor.textContent = 'Click here to download this data as csv';
                tableWrapper.appendChild(anchor);

                tableWrapper.appendChild(measurements.html);


                window.scrollTo(0, document.querySelector('.results').offsetTop);
            }
        }
    };

    this.getCurrentTarget = function () {
        return this.currentTargetIndex >= 0
            ? this.targets[this.targetOrderIndices[this.currentTargetIndex]]
            : null;
    };

    this.drawTargets = function () {
        const noOfTargets = this.noOfTargets;
        const distanceFromOrigin = this.targetDistances[this.currentDistanceIndex];
        const targetRadius = this.targetSizes[this.currentSizeIndex];

        this.targets = [];
        this.targetOrderIndices = [];

        for (let i = 0; i < noOfTargets; ++i) {
            const x = distanceFromOrigin * Math.sin(Math.PI * 2 * i / noOfTargets);
            const y = distanceFromOrigin * Math.cos(Math.PI * 2 * i / noOfTargets);
            const target = new Target(x, y, targetRadius);
            this.targets.push(target);

            target.drawTarget(target.getGray(200));
        }

        for (let i = 0; i < noOfTargets / 2; ++i) {
            this.targetOrderIndices.push(i);
            this.targetOrderIndices.push((i + (noOfTargets / 2)) % noOfTargets);
        }
    };

    this.nextTarget = function () {
        this.currentTargetIndex++;
        if (this.currentTargetIndex >= this.targets.length) {
            this.currentTargetIndex = 0;
            this.currentDistanceIndex++;

            if (this.currentDistanceIndex >= this.targetDistances.length) {
                this.targetDistances = this.shuffle(this.targetDistances);
                this.currentDistanceIndex = 0;
                this.currentSizeIndex++;

                if (this.currentSizeIndex >= this.targetSizes.length) {
                    this.currentSizeIndex = 0;
                    this.currentTargetIndex = -1;
                    console.log("Done!");
                    return false;
                }
            }
            this.drawTargets();
        }

        this.targets[this.targetOrderIndices[this.currentTargetIndex]].makeSelectable();
        return true;
    };

    this.getMeasurementsTable = function () {
        const _table_ = document.createElement('table'),
            _tr_ = document.createElement('tr'),
            _th_ = document.createElement('th'),
            _td_ = document.createElement('td');
        let csv = "";

        function buildHtmlTable(arr) {
            const table = _table_.cloneNode(false),
                columns = addAllColumnHeaders(arr, table);
            for (let i = 0; i < arr.length; ++i) {
                const tr = _tr_.cloneNode(false);
                for (let j = 0; j < columns.length; ++j) {
                    const td = _td_.cloneNode(false);
                    const cellValue = arr[i][columns[j]] || '';
                    csv += cellValue + ',';

                    td.appendChild(document.createTextNode(cellValue));
                    tr.appendChild(td);
                }
                csv += '\n';
                table.appendChild(tr);
            }
            return table;
        }

        function addAllColumnHeaders(arr, table) {
            const columnSet = [],
                tr = _tr_.cloneNode(false);
            for (let i = 0; i < arr.length; i++) {
                for (let key in arr[i]) {
                    if (arr[i].hasOwnProperty(key) && columnSet.indexOf(key) === -1) {
                        columnSet.push(key);
                        csv += '"' + key + '",';

                        const th = _th_.cloneNode(false);
                        th.appendChild(document.createTextNode(key));
                        tr.appendChild(th);
                    }
                }
            }
            csv += '\n';
            table.appendChild(tr);
            return columnSet;
        }

        const html = buildHtmlTable(this.measurements);
        return {
            html: html,
            csv: csv
        };
    }
}

function getDistance(fromX, toX, fromY, toY) {
    return Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
}

// Origin is the middle of the screen
function Target(tx, ty, radius) {
    this.prop = {
        x: 0,
        y: 0,
        radius: 0,
        color: 0,
        isSelectable: false
    };

    this.drawTarget = function (lineStyle, fillStyle) {
        c.beginPath();
        c.arc(this.prop.x, this.prop.y, this.prop.radius, 0, Math.PI * 2);

        if (lineStyle) {
            c.strokeStyle = lineStyle;
            c.lineWidth = '2';
            c.stroke();
        } else {
            c.strokeStyle = 'white';
            c.lineWidth = '5';
            c.stroke();
        }

        if (fillStyle) {
            c.fillStyle = fillStyle;
            c.fill();
        }
    };

    this.updateCoordinates = function (toCircle, fromX, fromY, fromRadius) {
        toCircle.x = fromX + (canvasLength / 2);
        toCircle.y = fromY + (canvasLength / 2);
        toCircle.radius = fromRadius;
    };

    this.trySelect = function (x, y) {
        const distance = getDistance(x, this.prop.x, y, this.prop.y);
        if (!this.prop.isSelectable || distance > this.prop.radius) return -1;

        this.drawTarget(this.getGray(0), this.getGray(0));

        this.prop.color = 0;
        this.prop.isSelectable = false;
        window.setTimeout(() => this.fade(this), 500);

        return Math.round(distance);
    };

    this.makeSelectable = function () {
        this.prop.isSelectable = true;
        this.drawHighlight();
    };

    this.drawHighlight = function () {
        this.drawTarget(this.getGray(100), 'maroon');
    };

    this.fade = function (that) {
        that.prop.color += 10;
        const x = that.prop.color;
        that.drawTarget(null, this.getGray(x));

        const currentTarget = fittsLaw.getCurrentTarget();
        if (currentTarget) {
            currentTarget.drawHighlight();
        }
        if (that.prop.color < 255) {
            window.setTimeout(() => that.fade(that), 25);
        }
    };

    this.getGray = function (x) {
        return `rgb(${x}, ${x}, ${x})`;
    };

    this.updateCoordinates(this.prop, tx, ty, radius);
}

function init() {
    fittsLaw = new FittsLaw();
    fittsLaw.init();
}
