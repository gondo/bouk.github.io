---
layout: post
title: A tale of Python, OpenCV and the GIL
---

For a school project I wanted to be able to track the position of multiple circles using my webcam. I was using Python in combination with Pygame to handle

Wij maken gebruik van de opensource OpenCV module om beelden te nemen met de webcam en om de beelden te verwerken. Helaas bleken de prestaties niet naar wens te zijn, dus hebben we besloten om het nemen van beelden en het verwerken van deze beelden in een parallele thread uit te voeren naast de game. Nadat we dit hadden geimplementeerd bleek ons hele spel vast te lopen, en na lang onderzoek bleek de dader een kenmerk van Python te zijn, genaamd GIL, oftewel de Global Interpreter Lock. We zullen eerst uitleggen wat de GIL is, waarom hierdoor ons spel vastliep en uiteindelijk hoe we dit hebben opgelost.

Toen Guido van Rossum de Python taal ontwierp heeft hij besloten om de garantie in te bouwen dat er maar 1 Python bytecode tegelijk kan worden uitgevoerd. Wat dit betekent is dat Python multithreading niet compleet ondersteund, als er meerdere threads zijn worden die niet tegelijk uitgevoerd. Dit is ook gedaan omdat de implementatie van de interpreter flink versimpeld wordt, als er geheugen niet door meerdere threads tegelijk kan worden aangepast. Nu kan je je misschien afvragen, wat heb je dan uberhaupt aan threads, als er Python code niet parallel kan worden uitgevoerd? Gelukkig gebruikt een Python applicatie niet alleen maar Python code! Python is geimplementeerd in C en er is voor gezorgd dat er in C kan worden aangegeven dat een bepaald stuk C code wel parallel kan worden uitgevoerd, zonder dat er Python waarden worden aangepast. Dit wordt gebruikt voor bijvoorbeeld het lezen van bestanden of voor compressie algoritmen, omdat die veel tijd kosten. Als deze C code uit wordt gevoerd kan er dus in een andere thread Python code uit worden gevoerd. De Python C library heeft 2 macro's om aan te geven of de GIL kan worden vrijgegeven en weer moet worden vastgezet en die heten `Py_BEGIN_ALLOW_THREADS` en `Py_END_ALLOW_THREADS`.

De OpenCV module blijkt helaas geen gebruik te maken van de mogelijkheid om aan te geven dat er Python code kan worden uitgevoerd terwijl er een foto wordt genomen en ook niet tijdens intensieve calculaties. Wat er dus gebeurde als een foto werd genomen, is dat de functie voor het nemen van een foto genaamd QueryFrame werd aangeroepen waarna de Python interpreter tot 30ms lang moest wachten tot deze functie klaar was met het nemen van een foto waarna deze functie vervolgens weer aangeroepen werd, omdat de bedoeling is dat er continu foto's worden genomen en geanalyseerd. Wat het resultaat hiervan is, is dat alles vastliep omdat Python alleen maar bezig was met het wachten tot de foto genomen was!

Nadat we ons dit realiseerden zijn we op onderzoek gegaan naar hoe de OpenCV Python module werkt en hoe we deze aan kunnen passen. Ten eerste hebben we de broncode gedownload op https://github.com/itseez/opencv. Terwijl we de broncode bekeken kwamen we er achter dat een groot deel van de C code voor de module gegenereerd wordt tijdens het compileren. Er waren wel een aantal functies die niet werden gegenereerd, zoals bijvoorbeeld 'WaitKey' wat een functie is die wacht tot er op een toets wordt gedrukt, wat dus lang kan duren. Die functie ziet er zo uit:
{% highlight c %}
static PyObject *pycvWaitKey(PyObject *self, PyObject *args, PyObject *kw)
{
  int delay = 0;

  const char *keywords[] = { "delay", NULL };
  if (!PyArg_ParseTupleAndKeywords(args, kw, "|i", (char**)keywords, &delay))
    return NULL;
  int r;
  Py_BEGIN_ALLOW_THREADS
  r = cvWaitKey(delay);
  Py_END_ALLOW_THREADS
  return FROM_int(r);
}
{% endhighlight %}
Zoals je kan zien maakt die gebruik van `Py_BEGIN_ALLOW_THREADS` en `Py_END_ALLOW_THREADS` zodat er Python code kan worden uitgevoerd terwijl er wordt gewacht op een toetsaanslag. Nadat we deze code begrepen hebben we de gegenereerde C code aangepast voor QueryFrame zodat deze er zo uitzag: (maak plaatje van ).
{% highlight c %}
static PyObject *pycvQueryFrame(PyObject *self, PyObject *args)
{
  CvCapture* capture;
  PyObject *pyobj_capture = NULL;

  if (!PyArg_ParseTuple(args, "O", &pyobj_capture))
    return NULL;
  Py_INCREF(pyobj_capture);
  if (!convert_to_CvCapturePTR(pyobj_capture, &capture, "capture")) return NULL;

  ROIplImage* r;
  Py_BEGIN_ALLOW_THREADS
  r = cvQueryFrame(capture);
  Py_END_ALLOW_THREADS

  Py_DECREF(pyobj_capture);

  return FROM_ROIplImagePTR(r);
}
{% endhighlight %}
Nadat we deze code compileerden en de aangepaste module installeerden werkte alles naar behoren en behaalden we een acceptabele framerate.



[opencv]: http://opencv.org/
[opencv-github]: https://github.com/itseez/opencv
[opencv-fork]: https://github.com/boukevanderbijl/opencv
[python-threads]: http://docs.python.org/2/c-api/init.html#threads
[python-release-gil]: http://docs.python.org/2/c-api/init.html#releasing-the-gil-from-extension-code