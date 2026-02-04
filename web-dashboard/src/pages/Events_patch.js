// Modal de détails de l'événement
const EventDetailsModal = ({ isOpen, onClose, event, onEdit, onDelete, onDuplicate }) => {
  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(false);

  useEffect(() => {
    if (isOpen && event?.id) {
      fetchZones();
    }
  }, [isOpen, event?.id]);

  const fetchZones = async () => {
    if (!event?.id) return;
    setLoadingZones(true);
    try {
      const res = await zonesAPI.getByEvent(event.id);
      setZones(res.data.data || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
      setZones([]);
    } finally {
      setLoadingZones(false);
    }
  };

  if (!isOpen || !event) return null;
