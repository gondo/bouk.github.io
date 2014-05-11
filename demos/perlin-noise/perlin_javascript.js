// http://devmag.org.za/2009/04/25/perlin-noise/
var generateNoise = (function(width, height){
   var noise = [];
   for(var x=0; x<width; x++) {
        noise[x] = [];
        for(var y=0; y<width; y++) {
            noise[x][y] = Math.random();
        }
    }
    return noise;
});
var interpolate = (function(x0, x1, alpha){
    var alpha2 = (1-Math.cos(alpha*Math.PI))/2;
    return (x0*(1-alpha2)+x1*alpha2);
});
var generateSmoothNoise = (function(noise, octave){
    var width = noise.length;
    var height = noise[0].length;
    
    var smoothNoise = [];
    
    var samplePeriod = Math.pow(2, octave);
    var sampleFrequency = 1/samplePeriod;
    for(var x = 0; x<width; x++) {
        var sample_x0 = Math.floor(x / samplePeriod) * samplePeriod;
        var sample_x1 = (sample_x0 + samplePeriod) % width;
        
        var horizontal_blend = (x - sample_x0) * sampleFrequency;
        smoothNoise[x] = [];
        for(var y = 0; y<height; y++) {
            var sample_y0 = Math.floor(y/samplePeriod) * samplePeriod;
            var sample_y1 = (sample_y0 + samplePeriod) % height;
            var vertical_blend = (y - sample_y0) * sampleFrequency;
            
            var top = interpolate(noise[sample_x0][sample_y0], noise[sample_x1][sample_y0], horizontal_blend);
            var bottom = interpolate(noise[sample_x0][sample_y1], noise[sample_x1][sample_y1], horizontal_blend);
            
            smoothNoise[x][y] = interpolate(top, bottom, vertical_blend);
            
        }
    }
    return smoothNoise;
});
var generatePerlinNoise = (function(noise, octaveCount, persistance) {
    var width = noise.length;
    var height = noise[0].length;
    
    var smoothNoise = [];
    
    for(var i = 0; i<octaveCount; i++) {
        smoothNoise[i] = generateSmoothNoise(noise, i);
    }
    
    var perlinNoise = [];
    for(var x = 0; x < width; x++) {
        perlinNoise[x] = [];
        for(var y = 0; y < height; y++) {
            perlinNoise[x][y] = 0;
        }
    }
    
    var amplitude = 1;
    var totalAmplitude = 0;
        
    for(var octave = octaveCount-1; octave > 0; octave--) {
        amplitude *= persistance;
        totalAmplitude += amplitude;
        
        for(var x = 0; x < width; x++) {
            for(var y = 0; y < height; y++) {
                perlinNoise[x][y] += smoothNoise[octave][x][y] * amplitude;
            }
        }
    }
    
    for(var x = 0; x < width; x++) {
        for(var y = 0; y < height; y++) {
            perlinNoise[x][y] /= totalAmplitude;
        }
    }
    
    return perlinNoise;
});
var canvas = document.getElementById("canvas");
var scale = 2;
var c = canvas.getContext('2d');

var height = canvas.height;
var width = canvas.width;

var data = generatePerlinNoise(generateNoise(width/scale, height/scale), 6, 0.4);
var details = generatePerlinNoise(generateNoise(width/scale, height/scale), 5, 0.2);

for (var x = 0; x<width/scale; x++) {
    for (var y = 0; y<height/scale; y++) {
        var point = data[x][y];
        if (point < 0.05) {
            c.fillStyle = "rgb(0, 0, 0)";
        } else if (point < 0.3) {
            var gradient = ((point-0.05)/0.25);
            c.fillStyle = "rgb(0, 0, "+Math.floor(gradient*220)+")";
        } else if (point < 0.525) {
            var gradient = Math.pow(((point - 0.3)/0.15), 5);
            c.fillStyle = "rgb("+Math.floor(gradient*255)+", "+Math.floor(gradient*248)+", 220)";
        } else if (point < 0.65) {
            c.fillStyle = "rgb(10, 150, 10)";
        } else {
            if (details[x][y] > 0.45) {
                c.fillStyle = "rgb(28, 82, 36)";
            } else {
                c.fillStyle = "rgb(10, 140, 10)";
            }
        }
        c.fillRect(x*scale, y*scale, scale, scale);
    }
}
