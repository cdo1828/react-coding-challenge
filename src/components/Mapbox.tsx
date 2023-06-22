
import { geoCentroid, geoContains } from 'd3-geo';
import type GeoJSON from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import Map, { Layer, LayerProps, MapLayerMouseEvent, MapRef, Popup, Source } from 'react-map-gl';
import countriesJson from '../data/countries.json';
import earthquakesJson from '../data/earthquakes.json';
import { Filter } from './Filter';
import { Legend } from './Legend';


const typedEarthquakes = earthquakesJson as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry>;
const typedCountries = countriesJson as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry>;

// Console is warning about duplicate keys
// Filter out countries with identical -99 iso_a3 value for simplicity and key warning (not crucial)
typedCountries.features = typedCountries.features.filter((country) => country.properties?.ISO_A3 !== '-99');

interface IPopup {
  longitude: number
  latitude: number
  title: string
  magnitude: number | null
  timeStamp: number
}

export const Mapbox = () => {

  //mapRef used to control mapboxgl
  const mapRef = useRef<MapRef | null>(null)
  const [earthquakes, setEarthquakes] = useState(typedEarthquakes)
  const [countries, setCountries] = useState(typedCountries);
  const [selectedCountry, setSelectedCountry] = useState<string>('ANY');
  const [popupInfo, setPopupInfo] = useState<IPopup | null>(null)



  // click event for when we click on the earthquake layer
  const onClick = (e: MapLayerMouseEvent) => {
    if (mapRef.current !== null) {
      const features = mapRef.current.queryRenderedFeatures(
        e.point,
        { layers: ['earthquake-layer'] }
      )

      // get the feature data
      const feature = features && features[0]
      if (feature && feature.geometry.type === 'Point') {
        const long = feature.geometry.coordinates[0];
        const lat = feature.geometry.coordinates[1];

        // set the popup data with the feature properties
        if (feature.properties) {
          setPopupInfo({
            longitude: long,
            latitude: lat,
            title: feature.properties.title,
            magnitude: feature.properties.mag,
            timeStamp: feature.properties.time
          });
        }
      }
    }
  };

  //styling layer mapbox-gl requests, the ID is very important here
  //layer styles could exist outside of component if not for the conditional for paint color
  const earthquakeLayerStyle: LayerProps = {
    id: 'earthquake-layer',
    type: 'circle',
    paint: {
      'circle-radius': 3,
      'circle-color': 'blue'
    }
  } as const;

  const outlineStyle: LayerProps = {
    id: 'countries-layer',
    type: "line",
    layout: {},
    paint: {
      "line-color": `${selectedCountry === 'ANY' ? 'grey' : 'red'}`,
      "line-width": 2,
    },
  } as const;



  //on load lets make the earthquake layer change the cursor to a pointer
  const attachMapEvents = () => {
    if (mapRef.current) {
      mapRef.current.on("mouseenter", "earthquake-layer", () => {
        //redundant check to appease typescript
        if (mapRef.current) mapRef.current.getCanvas().style.cursor = "pointer";
      });

      mapRef.current.on("mouseleave", "earthquake-layer", () => {
        if (mapRef.current) mapRef.current.getCanvas().style.cursor = "";
      });
    }
  }

  //only when the selected country changes do we update the countries and earthquakes we pass to the map
  useEffect(() => {
    // base case is that ANY is selected country
    if (selectedCountry === "ANY") {
      setEarthquakes(typedEarthquakes);
      setCountries(typedCountries);
      // recenter the map to our original place
      mapRef.current?.flyTo({
        zoom: 1.5,
        center: [-100, 40]
      });
      return;
    }

    //otherwise, find the new country and set state values to filtered countries and earthquakes

    //get the new country data
    const selectedCountryData = typedCountries.features.find((feature: GeoJSON.Feature) => {
      if (feature.properties && feature.properties?.ADMIN === selectedCountry) {
        return feature;
      }
      return false;
    })


    // create copy of earthquakes to filter
    const newEarthquakes = { ...typedEarthquakes };

    if (selectedCountryData) {
      //zoom on the new country
      const center = geoCentroid(selectedCountryData.geometry);
      mapRef.current?.flyTo({
        zoom: 3,
        center: [center[0], center[1]]
      });


      // check every earthquake to see if it exists within the selected country
      // this is a heavy calculation for certain countries (e.g. USA), potential optimization could be made
      newEarthquakes.features = newEarthquakes.features.filter((eq: GeoJSON.GeoJsonProperties) => {
        const quakeInCountry = geoContains(selectedCountryData.geometry, eq?.geometry.coordinates)
        return quakeInCountry;
      })

      setCountries((prev) => {
        //this also feels inefficient since we use so little of the previous state
        const newCountries = { ...prev };
        newCountries.features = [selectedCountryData];
        return newCountries;
      })
    }

    //set the new earthquakes to filtered list (or original json if no selected country found)
    setEarthquakes(newEarthquakes);
  }, [selectedCountry])

  return (
    <>
      <div className='map-container'>
        <Map
          attributionControl={false}
          ref={mapRef}
          initialViewState={{
            longitude: -100,
            latitude: 37,
            zoom: 1.5
          }}
          style={{ width: '100vw', height: '550px' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={process.env.REACT_APP_MAPBOXGL_ACCESS_TOKEN}
          onClick={onClick}
          onLoad={attachMapEvents}

        >
          {popupInfo && (
            <Popup
              anchor="top-right"
              longitude={popupInfo.longitude}
              latitude={popupInfo.latitude}
              onClose={() => setPopupInfo(null)}
            >
              <p>Title: {popupInfo.title}</p>
              <p>Magnitude: {popupInfo.magnitude}</p>
              <p>Timestamp: {`${new Date(popupInfo.timeStamp)}`}</p>
            </Popup>
          )}

          {/* layer to outline countries */}
          <Source id="countries-source" type="geojson" data={countries}>
            <Layer {...outlineStyle} />
          </Source>

          {/* later to show earthquake markers */}
          <Source id="earthquake-source" type="geojson" data={earthquakes}>
            <Layer {...earthquakeLayerStyle} />
          </Source>
        </Map>
      </div>
      <Legend title={popupInfo?.title} magnitude={popupInfo?.magnitude} timeStamp={popupInfo?.timeStamp} quakeCount={earthquakes.features.length} />
      {countries && (
        <Filter selectedCountry={selectedCountry} onChange={(country: string) => { setSelectedCountry(country) }} />
      )}
    </>
  )
}

