import { FC } from "react";
import countriesJson from '../data/countries.json';

interface IFilter {
  selectedCountry: string,
  onChange: (country: string) => void
}


//same as in map.tsx, filter out countries with -99 for key warning (this is optional, not necessary)
let { features } = countriesJson as GeoJSON.FeatureCollection<GeoJSON.Geometry>;
features = features.filter((feature) => feature.properties?.ISO_A3 !== '-99');


export const Filter: FC<IFilter> = ({ selectedCountry, onChange }) => {
  return (

    <div className='filter'>
      <h2>Filters</h2>
      <select value={selectedCountry} onChange={(e) => { onChange(e.target.value) }}>
        <option key={"ANY"} value={"ANY"}>
          Show all earthquakes
        </option>

        {features.map((country) => (
          <option
            key={country.properties?.ISO_A3}
            value={country.properties?.ADMIN}
          >
            {country.properties?.ADMIN}
          </option>
        ))}
      </select>
    </div>
  )
}