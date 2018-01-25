# EinsteinPredictImage
Simple application showcasing how to use the [Salesforce Einstein Platform API](https://metamind.readme.io/) in a Mobile SDK application.

![GitHub Logo](/iOS_Screenshot.png)

## Prerequisites

For using the wrapper you'll need to fulfill the following requirements:
* Access to a Salesforce org, i. e. a Developer Edition or a scratch org (you can [signup here for free](https://developer.salesforce.com/signup) if you don't have one).
* An API account for Salesforce Einstein Platform. Detailled instructions to the Einstein Platform API [here](https://metamind.readme.io/docs/what-you-need-to-call-api).
* Deployed Einstein Platform Apex Wrapper. Instructions for the Einstein Platform Apex Wrapper[here](https://github.com/muenzpraeger/salesforce-einstein-platform-apex/blob/master/README.md).
* Create an apex rest resource with the following code

```javascript
@RestResource(urlMapping='/einstein/*')
global with sharing class EinsteinResource {
    @HttpGet global static List<Map<String, String>> doGet() {
        String imgurl = RestContext.request.params.get('imgurl');
        String model = RestContext.request.params.get('model');

        if (model == null) { model = 'GeneralImageClassifier'; }
        // other values: FoodImageClassifier, MultiLabelImageClassifier, SceneClassifier

        Einstein_PredictionService service = new Einstein_PredictionService(Einstein_PredictionService.Types.IMAGE);
        Einstein_PredictionResult predictionResult = service.predictImageUrl(model, imgurl, 5, '');

        return convertToList(predictionResult);
    }    

    static List<Map<String, String>> convertToList(Einstein_PredictionResult predictionResult) {
        List<Map<String, String>> l = new List<Map<String, String>>();
        if (predictionResult != null) {
            for (Einstein_probability prediction : predictionResult.probabilities) {
                Map<String, String> m = new Map<String, String>();
                m.put('label', prediction.label);
                m.put('probability', '' + prediction.probability);
                l.add(m);
            }
        }
        return l;
    }    
}
```

## Installation/Running on iOS
``` shell
./installios.js # first time only
npm start
open ios/EinsteinPredictImage.xcworkspace
```

## Installation/Running on android
``` shell
./installandroid.js # first time only
npm start
# open android folder in Android Studio
```
