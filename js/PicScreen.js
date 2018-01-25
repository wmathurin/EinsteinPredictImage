/*
 * Copyright (c) 2016-present, salesforce.com, inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided
 * that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the
 * following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
 * the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or
 * promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    View,
} from 'react-native';

import {
    Button,
    ButtonGroup,
    Header,
    Slider,
    Text,
    Tile
} from 'react-native-elements';

import { net } from 'react-native-force';
import { showImagePicker } from 'react-native-image-picker';

var createReactClass = require('create-react-class');

const classifierLabels = ["General", "Food", "Multi Label", "Scene"];

const classifiers = ["GeneralImageClassifier", "FoodImageClassifier", "MultiLabelImageClassifier", "SceneClassifier"];

const formatProbability = (probability) => {
    return Math.floor(probability*100) + "%";
};

const pickPhoto = (callback) => {
    const options = {
        cancelButtonTitle: 'Cancel',
        takePhotoButtonTitle: 'Take Photo...', 
        chooseFromLibraryButtonTitle: 'Choose from Library...', 
        cameraType: 'front', 
        mediaType: 'photo', 
        maxWidth: 200, 
        maxHeight: 200, 
        allowsEditing: true, 
        noData: true,
        storageOptions: { 
            skipBackup: true, 
            path: 'images' 
        }
    };

    console.log("Showing image picker" + showImagePicker);
    
    showImagePicker(options, (response) => {
        console.log('Response = ' +  response);

        if (response.didCancel) {
            console.log('User cancelled image picker');
        }
        else if (response.error) {
            console.log('ImagePicker Error: ' + response.error);
        }
        else if (response.customButton) {
            console.log('User tapped custom button: ' +  response.customButton);
        }
        else {
            callback(response);
        }
    });
};

const getUserInfo = (callback) => {
    net.sendRequest('/services/data', '/v36.0/chatter/users/me', 
                    (response) => {
                        callback(response);
                    },
                    (error) => {
                        console.log('Failed to get user info:' + error);
                    }, 
                    'GET', 
                    {}, 
                    {'X-Connect-Bearer-Urls': 'true'}
                   );
};

const uploadPhoto = (localPhotoUrl, userId, callback) => {
    net.sendRequest('/services/data', '/v36.0/connect/user-profiles/' + userId + '/photo', 
                    (response) => {
                        callback(response);
                    },
                    (error) => {
                        console.log('Failed to upload user photo:' + error);
                    }, 
                    'POST', 
                    {}, 
                    {'X-Connect-Bearer-Urls': 'true'},
                    {fileUpload: {fileUrl:localPhotoUrl, fileMimeType:'image/jpeg', fileName:'pic.jpg'}}
                   );

};

const analyzePhoto = (classifier, imgurl, callback) => {
    net.sendRequest('/services/apexrest', '/einstein', 
                    (response) => {
                        callback(response);
                    },
                    (error) => {
                        console.log('Failed to analyze photo:' + error);
                    }, 
                    'GET', 
                    {'model': classifier, 'imgurl':imgurl}, 
                   );
};

const PicScreen = createReactClass({
    navigationOptions: {
        title: 'Photo Analyzer'
    },

    getInitialState() {
        return {
            photoUrl: null,
            classifier: 'GeneralImageClassifier',
            probabilities: []
        };
    },

    componentDidMount() {
        getUserInfo((userInfo) => {
            analyzePhoto(this.state.classifier, userInfo.photo.largePhotoUrl,
                         (probabilities) => {
                             this.setState({
                                 probabilities: probabilities,
                                 userId: userInfo.id,
                                 photoUrl: userInfo.photo.largePhotoUrl,
                                 photoVersionId: userInfo.photo.photoVersionId
                             });
                         });
        });
    },

    onChangePic() {
        pickPhoto((response) => {
            uploadPhoto(response.uri, this.state.userId, (response) => {
                analyzePhoto(this.state.classifier, response.largePhotoUrl,
                             (probabilities) => {
                                 this.setState({
                                     probabilities: probabilities,
                                     photoUrl: response.largePhotoUrl,
                                     photoVersionId: response.photoVersionId,
                                 });
                             });
            });
        });
    },

    onChangeClassifier(selectedIndex) {
        var classifier = classifiers[selectedIndex];
        analyzePhoto(classifier, this.state.photoUrl,
                     (probabilities) => {
                         this.setState({
                             classifier: classifier,
                             probabilities: probabilities
                         });
                     });
    },

    renderImage() {
        if (this.state.photoUrl) {
            return (
                    <Tile
                        featured
                        imageSrc={{uri: this.state.photoUrl}}
                        title="Press to change"
                        onPress={this.onChangePic}
                    />
            );
        }
        else {
            return (
                    <ActivityIndicator size="large" color="#0000ff" />
            );
        }
    },

    renderClassifiers() {
        var selectedIndex = classifiers.indexOf(this.state.classifier);
        return (
                <ButtonGroup
                    onPress={this.onChangeClassifier}
                    selectedIndex={selectedIndex}
                    buttons={classifierLabels}
                />
        );
    },

    renderProbabilities() {
        var rows = [];
        for (var i=0; i<Math.min(5, this.state.probabilities.length); i++) {
            var item = this.state.probabilities[i];
            rows.push(
                    <View style={styles.probability} key={item.label}>
                  <Slider disabled value={parseFloat(item.probability)} maximumValue={1} minimumValue={0} />
                  <Text>{item.label}: {formatProbability(item.probability)}</Text>
                </View>
            );
        }
        return <View style={styles.probabilities}>{rows}</View>;
    },

    render() {
        return (
            <View style={styles.container}>
                <Header><View/><Text h4 style={styles.title}>Analyze Photo</Text><View/></Header>
                {this.renderImage()}
                {this.renderClassifiers()}
                {this.renderProbabilities()}
            </View>
        );
    }
});

const styles = StyleSheet.create({
    container:{
        flex: 1,
        flexDirection: 'column',
    },
    title: {
        color: '#fff'
    },
    probabilities: {
        flex:1,
        flexDirection: 'column',
        padding: 5
    },
    probability: {
        flex:1,
        alignItems: 'stretch',
        justifyContent: 'center'
    }
});

export default PicScreen;
