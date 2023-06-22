import { FC } from "react";

interface ILegend {
  magnitude?: number | null;
  timeStamp?: number | null;
  title?: string | null;
  quakeCount?: number | null;
};

export const Legend: FC<ILegend> = ({ title, magnitude, timeStamp, quakeCount }) => {
  return (
    <div className='legend'>
      <h2>Legend</h2>
      {timeStamp || magnitude || title ? (
        <>
          {title && (<p>title: {title}</p>)}
          {magnitude && (<p>magnitute: {magnitude}</p>)}
          {timeStamp && (<p>timeStamp: {`${new Date(timeStamp)}`}</p>)}
        </>
      ) : (
        <>
          {quakeCount === 0 ? (
            <p>**There are no earthquakes in the selected country**</p>
          ) : (
            <p>Click an earthquake to see info</p>
          )}
        </>
      )
      }
    </div >
  )
};