"use client";
import DropdownNavSelect from '../../../components/DropdownNavSelect';

export default function RecordsTopControls({ initialTop, hideLabel = false }: { initialTop: number, hideLabel?: boolean }) {
  const opts = [1,2,3,4,5,6,7,8,9,10,20,30,50,100];
  return (
    <div className="flex items-center gap-4 mb-4">
      {!hideLabel && <label className="text-gray-200 font-medium">Top:</label>}
      <DropdownNavSelect name="top" value={String(initialTop)} options={opts.map(n => ({ value: String(n), label: `Top ${n}`}))} />
    </div>
  );
}  
