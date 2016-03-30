(function() {
    'use strict';

    angular.module('app')
        .service('dataService', [
        '$q', 'simtricityService', 'sitesService', 'toastService', 'quantitiesService', '$interval',
      dataService
    ]);

    function dataService($q, simtricityService, sitesService, toastService, quantitiesService, $interval){

        var dataOriginal = [];
        var dataConverted = [];
        
        var site = {};

        var params = {
            exportStartDate: moment().startOf('year').toDate(),
            exportEndDate: moment().subtract(1, 'days').toDate(),
            resolution: 'P1D',
            meterSerial: '',
            unitIndex: 0
        };
        
        var units = quantitiesService.units;

        var summary = {
            min: 0,
            max: 0,
            total: 0,
            average: 0
        };

        var meta = {
            site: site,
            params: params,
            unit: {},
            duration: {},
            period: ''
        };

        var service = {
          getData: getData,
          getOriginalData: getOriginalData,
          updateData: updateData,
          getMeta: getMeta,
          getParams: getParams,
          setParams: setParams,
          convertData: convertData,
          toggleAutoUpdate: toggleAutoUpdate
        };

        var autoUpdating = false;
        var autoUpdate = null;

        return service;    


        function getData() {
            return dataConverted;
        }

        function getOriginalData() {
            return dataOriginal;
        }

        function getMeta() {
            meta.unit = units[params.unitIndex];
            meta.site = site;
            meta.params = params;
            meta.duration.days = Math.ceil(moment.duration(moment(params.exportEndDate).diff(moment(params.exportStartDate))).asDays());
            meta.period = quantitiesService.resolutions.filter(function(resolution) { return resolution.code == params.resolution} )[0].period;
            return meta;
        }

        function getParams() {
            return params;
        }

        function setParams(newParams, siteCode) {
            params = newParams;
            sitesService.loadItem(siteCode).then(function(siteData) {
                site = siteData;
                params.meterSerial = site.meterSerial;
                updateData().then(function() {
                    convertData();
                }); 
            });
        }

        function updateData() {

            //update data using simtricity service TODO Toast notifications sometimes get stuck. Fix before renabling.
            // var toast = toastService.createPersistentToast('Retrieving data from Simtricity');
            return simtricityService.retrieve(params).then(function() {
                dataOriginal = [];
                for (var i = simtricityService.data.length - 1; i >= 0; i--) {
                    dataOriginal.unshift([
                        moment(simtricityService.data[i].Time).format('x'),
                        simtricityService.data[i].Import// * units[params.unitIndex].factor
                    ])
                };
                // toastService.hidePersistentToast(toast);
            });
        }

        function convertData() {

            dataConverted = [];

            for (var i = dataOriginal.length - 1; i >= 0; i--) {
                dataConverted.unshift([
                    dataOriginal[i][0],
                    dataOriginal[i][1] * units[params.unitIndex].factor
                ])
            }

        }

        //Auto update of data - TODO: move some of this to a separate service.
        function toggleAutoUpdate() {
            console.log('toggle');
            if(autoUpdating) 
                stopAutoUpdate();
            else
                startAutoUpdate();

        }
        
        function startAutoUpdate() {
            autoUpdating = true;
            autoUpdate = $interval(function() {
                if(moment().isBetween(
                    moment().hour(7).minute(0).seconds(0),
                    moment().hour(7).minute(5).seconds(0)
                )) {
                    params.exportStartDate = moment().startOf('year').toDate();
                    params.exportEndDate = moment().subtract(1, 'days').toDate();
                    updateData();
                }
            }, 300000);
        }

        function stopAutoUpdate() {
            autoUpdating = false;
            $interval.cancel(autoUpdate);
        }

    }
  
})();
