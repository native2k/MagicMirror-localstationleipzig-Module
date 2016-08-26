# MagicMirror-localstationleipzig-Module

<p>
<img src="https://img.shields.io/badge/Status-BETA-red.svg" alt="Status-BETA">
<a href="http://choosealicense.com/licenses/mit"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

This module display the next local transport on your stop in Leipzig. 

## Installation

Go to your MagicMirror folder.

`cd MagicMirror`

Clone the repository.

`git clone https://github.com/native2k/MagicMirror-localstationleipzig-Module.git modules/localstation`

## Configuration

Add module configuration to config.js.

```js
{
  module: 'localstation',
  position: 'ANY_POSITION',


  config: {
      maxShow: 10,
      departureTime: 5,
      alternatives: true,
      maxAlternatives: 3,

      stop: 'Leipzig, Marschnerstr.',
      doMerge : true,
      filter: {
          'STR 1': {
              merge: {
                'Lausen': ['Lausen', 'Leipzig, Lausen'],
                'Hauptbahnhof': ['Schönefeld', "Grünau-Süd", 'Mockau', "Leipzig, Mockau, Post"],
              }
          },
          'STR 14': {
              blacklist: ['S-Bf. Plagwitz'],
              whitelist: ['Hauptbahnhof'],
          },
      },
  },
},
```

|Option|Description|
|---|---|
|`stop`|Name of the stop (go to https://www.l.de/verkehrsbetriebe/fahrplan and copy paste the name from there).|
|`maxShow`|The maximum number to show.|
|`departureTime`|How many minutes in the future to request.|
|`alternatives`|If true not only the most recent transport is show but also the next alternatives.|
|`maxAlternatives`|How many alternative times you will see.|
|`doMerge`|If true and a merge dictionary exists in filter the directions will be merged together.|
|`filter`|Possible to show only some transport lines, if you wanna filter a complete line, just add it as key with an empty dict.|
|`merge`|Merge the list of directions together that they look like a single direction named like the key.|
|`blacklist`|Which directions to not show.|
|`whitelist`|Which directions to always show.|
